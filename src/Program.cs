using MovexPortal.Middleware;
using MovexPortal.Services;
using Microsoft.AspNetCore.Authentication;
using Polly;
using Polly.Extensions.Http;

var builder = WebApplication.CreateBuilder(args);

builder.WebHost.UseUrls("http://localhost:5050");

// ── Server secrets file (Production) ─────────────────────────────────────────
// Stores API keys for downstream services (MyInvois-Service, Reporting-Service)
// OUTSIDE the deployment folder so they survive every redeployment.
// NTFS ACLs restrict read access to "IIS AppPool\smportal" only.
//
// Setup: Run scripts\Setup-ServerSecrets.ps1 on SRXWEBAPP1 as Administrator.
// Default path: C:\ProgramData\SRX\SM-Portal\secrets.json
// Override via SMPORTAL_SECRETS_PATH env var in web.config.
//
// Upgrade path: When Azure Key Vault is provisioned, swap this block for
// AddAzureKeyVault() using the same key names (ADR-006).
var secretsFilePath = builder.Configuration["SMPORTAL_SECRETS_PATH"]
    ?? @"C:\ProgramData\SRX\SM-Portal\secrets.json";

if (File.Exists(secretsFilePath))
{
    builder.Configuration.AddJsonFile(secretsFilePath, optional: false, reloadOnChange: false);
}
else if (!builder.Environment.IsDevelopment())
{
    // Startup warning — service will run with empty keys which will cause 401s from downstream APIs
    Console.WriteLine(
        $"[WARN] SM-Portal secrets file not found at {secretsFilePath}. " +
        "Run scripts\\Setup-ServerSecrets.ps1 on SRXWEBAPP1.");
}

// Add services to the container
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new() { Title = "MOVEX Portal API", Version = "v1" });
});

// Windows Authentication for AD integration.
//
// The auth scheme must follow the ACTUAL SERVER, not the environment name:
//   - IIS in-process: IIS owns the Negotiate/NTLM handshake at kernel level.
//     AddNegotiate() conflicts with it and throws InvalidOperationException on startup.
//     Register "Windows" (IISDefaults.AuthenticationScheme) so ASP.NET Core defers
//     to the identity IIS already resolved.
//   - Kestrel (local dev, CI, staging without IIS): IIS is not present, so the
//     Negotiate middleware must handle the handshake itself via AddNegotiate().
//
// APP_POOL_ID is injected by IIS into w3wp.exe at startup and is never present
// in a Kestrel process, making it the most reliable discriminator regardless of
// what ASPNETCORE_ENVIRONMENT is set to.
var hostedOnIIS = !string.IsNullOrEmpty(Environment.GetEnvironmentVariable("APP_POOL_ID"));

if (hostedOnIIS)
{
    // IIS manages the Windows auth handshake — defer to it.
    // Requires: IIS site → Authentication → Windows Authentication = Enabled
    //           IIS site → Authentication → Anonymous Authentication = Disabled
    //           (enforced in web.config <security> block)
    builder.Services.AddAuthentication("Windows");
}
else
{
    // Kestrel: run the Negotiate middleware to handle NTLM/Kerberos directly.
    builder.Services.AddAuthentication(
            Microsoft.AspNetCore.Authentication.Negotiate.NegotiateDefaults.AuthenticationScheme)
        .AddNegotiate();
}

builder.Services.AddAuthorization();


// Resolve a config-supplied path against AppContext.BaseDirectory so that relative
// paths work correctly under both Kestrel (dev) and IIS in-process (production).
// Path.GetFullPath is a no-op when the configured value is already absolute.
static string ResolvePath(string? configured, string relativeFallback) =>
    Path.GetFullPath(configured ?? relativeFallback, AppContext.BaseDirectory);

// Normalize base URLs: ensure trailing slash to prevent relative request path segment loss.
// For example, "http://host/service" + "api/v1/..." without slash = "http://host/api/v1/..." (missing /service)
// With trailing slash: "http://host/service/" + "api/v1/..." = "http://host/service/api/v1/..."
static string EnsureTrailingSlash(string url) =>
    url.EndsWith("/") ? url : url + "/";

// Register RBAC config provider
var rbacConfigPath = ResolvePath(
    builder.Configuration["Rbac:ConfigPath"],
    Path.Combine("config", "rbac-config.json"));
builder.Services.AddSingleton<IRbacConfigProvider>(sp => new RbacConfigProvider(rbacConfigPath));
// Register RBAC service with config provider
builder.Services.AddSingleton<IRbacService, RbacService>(sp =>
    new RbacService(sp.GetRequiredService<IRbacConfigProvider>()));

// Implements: architecture/audit-logging-framework
var auditLogPath = builder.Configuration["Audit:LogPath"];
builder.Services.AddSingleton<IAuditService>(sp => new AuditService(auditLogPath));

// Implements: architecture/endpoint-registry-provider
var registryPath = ResolvePath(
    builder.Configuration["Endpoints:RegistryPath"],
    Path.Combine("config", "endpoint-registry.json"));
builder.Services.AddSingleton<IEndpointRegistryProvider>(sp => new EndpointRegistryProvider(registryPath));

// Implements: architecture/endpoint-discovery-service
builder.Services.AddScoped<IEndpointDiscoveryService, EndpointDiscoveryService>();

// Implements: architecture/generic-endpoint-executor
builder.Services.AddScoped<IGenericEndpointExecutor, GenericEndpointExecutor>();

// MyInvois.Api internal HTTP client (implements ADR-001 HTTP separation).
// Polly: 3 retries with exponential back-off + circuit breaker after 5 failures (workspace rule).
// API key from user-secrets: dotnet user-secrets set "MyInvoisApi:ApiKey" "<same as MyInvois.Api ApiKeys:Primary>"
builder.Services.AddHttpClient<InvoiceApiClient>(client =>
{
    client.BaseAddress = new Uri(EnsureTrailingSlash(builder.Configuration["MyInvoisApi:BaseUrl"] ?? "http://localhost:5051/"));
    client.DefaultRequestHeaders.Add("X-API-Key",
        builder.Configuration["MyInvoisApi:ApiKey"] ?? string.Empty);
    client.Timeout = TimeSpan.FromSeconds(90); // DB2 query up to 60s + network margin
})
.AddPolicyHandler(HttpPolicyExtensions
    .HandleTransientHttpError()
    .WaitAndRetryAsync(3, attempt => TimeSpan.FromSeconds(Math.Pow(2, attempt))))
.AddPolicyHandler(HttpPolicyExtensions
    .HandleTransientHttpError()
    .CircuitBreakerAsync(5, TimeSpan.FromSeconds(30)));

// Reporting-Service HTTP client — exchange rate SPOT price proxy.
// API key from user-secrets: dotnet user-secrets set "ReportingApi:ApiKey" "<Reporting-Service primary API key>"
// BaseUrl in appsettings.Development.json for dev; actual prod URL via Setup-ServerSecrets.ps1.
var reportingApiBaseUrl = builder.Configuration["ReportingApi:BaseUrl"];
var reportingApiKey = builder.Configuration["ReportingApi:ApiKey"];

// In non-development environments, fail fast if required ReportingApi configuration is missing.
if (!builder.Environment.IsDevelopment())
{
    if (string.IsNullOrWhiteSpace(reportingApiBaseUrl) || string.IsNullOrWhiteSpace(reportingApiKey))
    {
        throw new InvalidOperationException("Missing required ReportingApi configuration (ReportingApi:BaseUrl and/or ReportingApi:ApiKey).");
    }
}

builder.Services.AddHttpClient<ExchangeRateApiClient>(client =>
{
    // In development, fall back to localhost if BaseUrl is not configured.
    var baseUrl = EnsureTrailingSlash(reportingApiBaseUrl ?? "http://localhost:5052/");
    client.BaseAddress = new Uri(baseUrl);
    client.DefaultRequestHeaders.Add("X-API-Key", reportingApiKey ?? string.Empty);
    client.Timeout = TimeSpan.FromSeconds(15);
})
.AddPolicyHandler(HttpPolicyExtensions
    .HandleTransientHttpError()
    .WaitAndRetryAsync(2, attempt => TimeSpan.FromSeconds(attempt * 2)))
.AddPolicyHandler(HttpPolicyExtensions
    .HandleTransientHttpError()
    .CircuitBreakerAsync(3, TimeSpan.FromSeconds(30)));

// CORS for frontend SPA.
// In production the frontend is served as static files from the same IIS site,
// so the frontend and API share the same origin — CORS is not required.
// In development the Vite dev server runs on a different port, so CORS is needed.
// Frontend:Url is set in appsettings.Development.json; it is empty in base config.
var frontendUrl = builder.Configuration["Frontend:Url"] ?? "";
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        if (!string.IsNullOrEmpty(frontendUrl))
        {
            policy.WithOrigins(frontendUrl)
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
        }
        else
        {
            // Same-origin (production): CORS middleware is a no-op.
            policy.SetIsOriginAllowed(_ => false);
        }
    });
});

var app = builder.Build();

// Strip /api path base so Kestrel (dev) matches IIS virtual application path behaviour.
// In IIS, the app lives at /api — requests arrive at ASP.NET Core with /api already stripped
// by the IIS virtual directory. In Kestrel, UsePathBase replicates that, keeping routes
// consistent across both environments (no api/ prefix in [Route] attributes needed).
app.UsePathBase("/api");

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

//app.UseHttpsRedirection();

app.UseCors("AllowFrontend");

app.UseAuthentication();
app.UseAuthorization();

// Apply skills-based middleware pipeline
// Order matters: RBAC check → Execute → Audit log
app.UseMiddleware<RbacMiddleware>();
app.UseMiddleware<AuditLoggingMiddleware>();

app.MapControllers();

// DIAGNOSTIC: Check if Windows Auth is enabled
app.MapGet("/debug/auth-schemes", (HttpContext context) =>
{
    var schemes = context.RequestServices
        .GetRequiredService<IAuthenticationSchemeProvider>()
        .GetAllSchemesAsync().Result
        .Select(s => new { s.Name, s.DisplayName, s.HandlerType })
        .ToList();

    return Results.Ok(new
    {
        authenticatedUser = context.User.Identity?.Name,
        authenticationScheme = context.User.Identity?.AuthenticationType,
        isAuthenticated = context.User.Identity?.IsAuthenticated,
        registeredSchemes = schemes
    });
});

app.Run();
