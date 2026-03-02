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
// IIS owns the Negotiate/NTLM handshake at kernel level — AddNegotiate() conflicts with it
// and throws InvalidOperationException on startup. Use IISDefaults in production and
// the Negotiate middleware only when self-hosting on Kestrel (development).
if (builder.Environment.IsDevelopment())
{
    builder.Services.AddAuthentication(
            Microsoft.AspNetCore.Authentication.Negotiate.NegotiateDefaults.AuthenticationScheme)
        .AddNegotiate();
}
else
{
    // Defer entirely to IIS Windows Authentication.
    // "Windows" is IISDefaults.AuthenticationScheme — using the literal avoids a
    // compile-time dependency on Microsoft.AspNetCore.Server.IIS which is not
    // guaranteed to be available on all build machines / SDK configurations.
    // Requires: IIS site → Authentication → Windows Authentication = Enabled
    //           IIS site → Authentication → Anonymous Authentication = Disabled
    builder.Services.AddAuthentication("Windows");
}

builder.Services.AddAuthorization();


// Register RBAC config provider
var rbacConfigPath = builder.Configuration["Rbac:ConfigPath"]
    ?? Path.Combine(AppContext.BaseDirectory, "config", "rbac-config.json");
builder.Services.AddSingleton<IRbacConfigProvider>(sp => new RbacConfigProvider(rbacConfigPath));
// Register RBAC service with config provider
builder.Services.AddSingleton<IRbacService, RbacService>(sp =>
    new RbacService(sp.GetRequiredService<IRbacConfigProvider>()));

// Implements: architecture/audit-logging-framework
var auditLogPath = builder.Configuration["Audit:LogPath"];
builder.Services.AddSingleton<IAuditService>(sp => new AuditService(auditLogPath));

// Implements: architecture/endpoint-registry-provider
var registryPath = builder.Configuration["Endpoints:RegistryPath"] 
    ?? Path.Combine(AppContext.BaseDirectory, "config", "endpoint-registry.json");
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
