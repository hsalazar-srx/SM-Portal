using MovexPortal.Middleware;
using MovexPortal.Services;
using Microsoft.AspNetCore.Authentication;

var builder = WebApplication.CreateBuilder(args);

builder.WebHost.UseUrls("http://localhost:5050");

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

// CORS for frontend SPA
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(builder.Configuration["Frontend:Url"] ?? "http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

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
app.MapGet("/api/debug/auth-schemes", (HttpContext context) =>
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
