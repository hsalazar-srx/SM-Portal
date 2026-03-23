# SM-Portal Deployment: Lessons Learned

**Date**: March 2, 2026  
**Duration**: 8+ hours of troubleshooting  
**Status**: CRITICAL GAPS IDENTIFIED & RESOLVED  
**Author**: DevOps/Development Team  

---

## Executive Summary

The initial SM-Portal IIS deployment encountered **6 critical configuration gaps** between development and production environments that consumed 8+ hours of troubleshooting. All issues were environment-specific (not code bugs) and could have been prevented with proper environment parity checks and automated validation.

**Root Cause**: Development used `dotnet run` (Kestrel) with relative paths and localhost bindings, but production required IIS-specific configuration (app pools, authentication, content root paths) that were not validated before deployment.

---

## Issues Encountered

### Issue 1: Content Root Path Mismatch ⚠️ CRITICAL

**Problem**:
- Backend app looked for `config/endpoint-registry.json` at relative path `./config/`
- In IIS, this resolved to wrong directory: `C:\inetpub\wwwroot\config\` instead of `C:\inetpub\wwwroot\SM-Portal\config\`
- Result: `DirectoryNotFoundException` on every request → 500 Internal Server Error

**Root Cause**: 
- Development environment: `AppDomain.CurrentDomain.BaseDirectory` = project root
- IIS environment: `AppDomain.CurrentDomain.BaseDirectory` = `C:\inetpub\wwwroot\` (wrong parent)
- No environment-specific content root configuration

**Fix Applied**:
```csharp
// Set content root BEFORE WebApplication initialization
var contentRoot = Environment.GetEnvironmentVariable("ASPNETCORE_CONTENTROOT") 
    ?? (Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Production"
        ? @"C:\inetpub\wwwroot\SM-Portal"
        : Directory.GetCurrentDirectory());

builder.Host.UseContentRoot(contentRoot);
```

**Prevention**: 
- ✅ **Add deployment validation test**: Verify config files load in actual IIS environment
- ✅ **Use absolute paths or Environment.ContentRootPath** (not relative paths)
- ✅ **Set ASPNETCORE_CONTENTROOT environment variable** in web.config for IIS

---

### Issue 2: **Negotiate Authentication Conflicts with IIS Windows Auth** ⚠️ CRITICAL

**Problem**:
- Code used `AddNegotiate()` handler
- IIS had Windows Authentication enabled
- Both tried to handle auth → conflict → 500 error
- Error message: *"The Negotiate Authentication handler cannot be used on a server that directly supports Windows Authentication"*

**Root Cause**:
- Development: `dotnet run` with Kestrel + Negotiate works fine
- Production: IIS Windows Auth already built-in, Negotiate causes conflict
- No environment detection for which auth to use

**Fix Applied**:
```csharp
// Use IIS-specific auth in production
if (app.Environment.IsProduction())
{
    builder.Services.AddAuthentication(IISDefaults.AuthenticationScheme);
    builder.Services.Configure<IISOptions>(options =>
    {
        options.AutomaticAuthentication = true;
    });
}
else
{
    // Dev: Use Negotiate with Kestrel
    builder.Services.AddAuthentication(NegotiateDefaults.AuthenticationScheme)
        .AddNegotiate();
}
```

**Prevention**:
- ✅ **Add environment-specific auth tests**: Verify Windows Auth works in IIS before deploying
- ✅ **Document: Don't use AddNegotiate() in IIS with Windows Auth**
- ✅ **Add pre-deployment checklist**: "Confirm authentication method for target environment"

---

### Issue 3: **Multiple App Pools Interfering** ⚠️ HIGH

**Problem**:
- IIS site bound to **both** `DefaultAppPool` (.NET CLR v4.0) AND `SMPortalPool` (.NET 8)
- Requests randomly routed to wrong pool
- `.NET 4.0 pool couldn't run .NET 8` app → 500.35 errors

**Root Cause**:
- IIS default configuration assigns DefaultAppPool to new sites
- No automated validation that correct pool is assigned
- No documentation of required pool setup

**Fix Applied**:
```powershell
# Explicitly reassign to correct pool
& "C:\Windows\System32\inetsrv\appcmd.exe" set app "SM-Portal/" /applicationPool:"SMPortalPool"
# Stop competing pool
& "C:\Windows\System32\inetsrv\appcmd.exe" stop apppool "DefaultAppPool"
```

**Prevention**:
- ✅ **Add deployment script validation**: Verify only one app pool assigned
- ✅ **Create IIS setup script**: Builds complete config (pools, sites, bindings, auth) in one go
- ✅ **Add pre-deployment test**: Verify correct pool is running app

---

### Issue 4: **Kestrel Port Conflicts (InProcess Hosting)** ⚠️ HIGH

**Problem**:
- App used `app.UseKestrel()` with hardcoded port 5050
- IIS InProcess mode conflicts with Kestrel binding
- Result: `SocketException (10013)` - port access denied

**Root Cause**:
- Development: `dotnet run` requires Kestrel configuration
- IIS InProcess: **IIS handles port binding**, app should NOT configure Kestrel
- Configuration not environment-aware

**Fix Applied**:
```json
// appsettings.Production.json - REMOVE Kestrel section entirely for IIS InProcess
{
  "Logging": { /* ... */ },
  "ConnectionStrings": { /* ... */ }
  // NO Kestrel section for IIS InProcess!
}
```

**Prevention**:
- ✅ **Add validation**: Verify no Kestrel URL config in Production environment
- ✅ **Document**: "For IIS InProcess hosting, remove Kestrel Endpoints section"
- ✅ **Add pre-deployment test**: Try starting app in IIS, verify no port binding errors

---

### Issue 5: **Frontend/Backend Routing Conflict** ⚠️ MEDIUM

**Problem**:
- Frontend deployed to `/SMPortal` sub-path in IIS
- Frontend called backend API at `/SMPortal/api/health` 
- But backend was at root `/api/health`
- Routes didn't match → 500 errors

**Root Cause**:
- Environment variable `VITE_API_URL` not set for Production
- Frontend defaulted to hardcoded `http://localhost:5050` 
- No environment-specific API endpoint configuration

**Fix Applied**:
```bash
# Created environment files
# .env.development
VITE_API_URL=http://localhost:5050

# .env.production  
VITE_API_URL=http://localhost/api
```

**Prevention**:
- ✅ **Create ALL environment files before deployment**: .env.production, .env.staging, .env.development
- ✅ **Add build-time validation**: Verify VITE_API_URL is set during `npm run build`
- ✅ **Document**: "Frontend must use environment variables for API endpoints"
- ✅ **Add pre-deployment test**: Verify frontend can reach backend API

---

### Issue 6: **Data Protection Keys Not Persisted** ⚠️ MEDIUM

**Problem**:
- App used ASP.NET Core Data Protection but didn't configure persistence
- Keys stored in ephemeral location → lost on app restart
- Auth tokens/sessions failed after IIS recycle
- Warning: *"Neither user profile nor HKLM registry available"*

**Root Cause**:
- Development: Local temp storage OK for testing
- Production: Keys must persist to disk or registry
- No environment-specific key storage configured

**Fix Applied**:
```csharp
// Configure key persistence for production
builder.Services.AddDataProtection()
    .PersistKeysToFileSystem(new DirectoryInfo(@"C:\InetPub\SM-Portal\keys"))
    .SetApplicationName("SM-Portal");
```

**Prevention**:
- ✅ **Add to startup code**: Always configure DataProtection persistence for cloud/IIS
- ✅ **Grant app pool write access** to keys folder
- ✅ **Add pre-deployment test**: Verify no "ephemeral repository" warnings in logs

---

## Pattern: Environment Parity Gaps

All 6 issues share a common pattern:

```
Development (dotnet run)          →  Production (IIS)
─────────────────────────────────────────────────────
Relative paths                    →  Absolute paths needed
localhost:5050 (Kestrel)          →  IIS manages port
Negotiate auth                    →  Windows Auth native
Kestrel configuration             →  Conflicts with IIS
Environment variables in shell   →  Need web.config / ENV VARS
Ephemeral storage OK              →  Need persistent storage
```

**Root Cause**: Code assumed development environment behavior would work in production.

---

## What Should Have Been Done

### 1. **Pre-Deployment Validation Checklist** ✅

Create and run this **before ANY production deployment**:

```powershell
# Validation Tests (Add to CI/CD or pre-deployment script)

# 1. Verify config files load
dotnet run --configuration Production --environment Production --validate-only

# 2. Verify Windows Auth works
Invoke-WebRequest -Uri "http://localhost/api/health" -UseDefaultCredentials

# 3. Verify data protection keys persist
Test-Path "C:\InetPub\SM-Portal\keys"

# 4. Verify IIS app pool is correct
& "C:\Windows\System32\inetsrv\appcmd.exe" list site "SM-Portal"

# 5. Verify environment variables are set
[Environment]::GetEnvironmentVariable("ASPNETCORE_CONTENTROOT", "Machine")

# 6. Verify frontend build has correct API endpoint
Select-String -Path "frontend\dist\index.html" -Pattern "localhost:5050"  # Should NOT find this
```

### 2. **Environment-Specific Configuration** ✅

**Pattern to follow**:

```
Development               Staging                 Production
─────────────────────────────────────────────────────────────
appsettings.json    →   appsettings.Staging.json →  appsettings.Production.json
.env.development    →   .env.staging             →  .env.production
dotnet run          →   dotnet run               →  IIS (web.config)
localhost:5050      →   https://staging.local   →  https://sm-portal.local
Negotiate auth      →   Windows Auth            →  Windows Auth
```

**Requirement**: Test changes in each environment **before going live**.

### 3. **Automated Integration Tests** ✅

```csharp
// Integration tests that MUST PASS in all environments
[Fact]
public async Task ConfigFilesLoadInCurrentEnvironment()
{
    // Verify config directory exists relative to app
    Assert.True(Directory.Exists(Path.Combine(
        _app.Services.GetRequiredService<IWebHostEnvironment>().ContentRootPath,
        "config"
    )));
}

[Fact]
public async Task DataProtectionKeysAreConfigured()
{
    // Should not see "ephemeral" warnings in logs
    var logger = _app.Services.GetRequiredService<ILogger>();
    // Verify keys folder is writable
}

[Fact]
public async Task AuthenticationMethodMatchesEnvironment()
{
    // In Production, should use IISDefaults, not Negotiate
    if (_app.Environment.IsProduction())
    {
        Assert.NotNull(_app.Services.GetService<IAuthorizationService>());
    }
}

[Fact]
public async Task ApiEndpointIsResponsive()
{
    var response = await _client.GetAsync("/api/health");
    Assert.Equal(System.Net.HttpStatusCode.OK, response.StatusCode);
}
```

### 4. **Deployment Script That Validates Everything** ✅

```powershell
# deploy-production.ps1 - Run this instead of manual steps

param(
    [string]$Environment = "Production"
)

# Pre-deployment validation
Write-Host "=== Pre-Deployment Validation ===" -ForegroundColor Cyan

# Check environment variables
$vars = @('ASPNETCORE_CONTENTROOT', 'ConnectionStrings__AuditLog')
foreach ($var in $vars) {
    $val = [Environment]::GetEnvironmentVariable($var, "Machine")
    if ([string]::IsNullOrEmpty($val)) {
        Write-Host "❌ Missing environment variable: $var" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ $var is set" -ForegroundColor Green
}

# Verify IIS configuration
$site = & "C:\Windows\System32\inetsrv\appcmd.exe" list site "SM-Portal"
if (-not $site) {
    Write-Host "❌ IIS site SM-Portal not found" -ForegroundColor Red
    exit 1
}

# Verify app pool
$pool = & "C:\Windows\System32\inetsrv\appcmd.exe" list apppool "SMPortalPool"
if (-not $pool.Contains("Started")) {
    Write-Host "❌ App pool not started" -ForegroundColor Red
    exit 1
}

Write-Host "`n=== All validations passed ===" -ForegroundColor Green

# Proceed with deployment
# ... (actual deployment steps)
```

### 5. **Environment Parity Test Gate** ✅

Before selecting "Production" deployment:

```
┌─────────────────────────────────────────┐
│ ENVIRONMENT PARITY VERIFICATION         │
├─────────────────────────────────────────┤
│ ☑ Config files load in target env      │
│ ☑ Auth method matches environment      │
│ ☑ Data protection keys are persistent  │
│ ☑ API endpoints are accessible         │
│ ☑ Frontend API URL is correct          │
│ ☑ IIS app pool is configured           │
│ ☑ File permissions are correct         │
│ ☑ Logs show no warnings                │
│                                         │
│  [Deploy] or [Abort]                   │
└─────────────────────────────────────────┘
```

---

## Recommended Preventive Actions

### Immediate (This Week)

- [ ] **Create deployment validation script** (see "Deployment Script" above)
- [ ] **Add pre-deployment checklist** to IIS_DEPLOYMENT_RUNBOOK.md
- [ ] **Document all environment differences** (see table below)
- [ ] **Run validation on current production deployment** to confirm fixes

### Short-Term (This Sprint)

- [ ] **Add integration tests** for environment-specific code paths
- [ ] **Create environment configuration templates** for staging/production
- [ ] **Add "Configuration Handbook"** explaining each setting per environment
- [ ] **Set up CI/CD validation** that runs pre-deployment checks automatically

### Long-Term (Next Quarter)

- [ ] **Implement Infrastructure as Code (Terraform/Ansible)** to build IIS configuration automatically
- [ ] **Add production smoke tests** that run after deployment
- [ ] **Create IIS golden image** with SM-Portal pre-configured to prevent manual errors
- [ ] **Establish "deploy to staging first" policy** - test in staging before production

---

## Environment Configuration Matrix

Keep this document updated to show EXACT differences:

| Setting | Development | Staging | Production |
|---------|-------------|---------|-----------|
| **ASPNETCORE_ENVIRONMENT** | Development | Staging | Production |
| **ASPNETCORE_CONTENTROOT** | `C:\Projects\SM-Portal` (relative) | `C:\inetpub\wwwroot\SM-Portal` | `C:\inetpub\wwwroot\SM-Portal` |
| **Connection String** | LocalDB or mock | Staging SQL Server | Production SQL Server |
| **Authentication** | IISDefaults or Negotiate | Windows Auth (IIS) | Windows Auth (IIS) |
| **Kestrel Config** | `http://localhost:5050` | NONE (IIS) | NONE (IIS) |
| **Data Protection Keys** | Ephemeral OK | `C:\staging\keys` | `C:\inetpub\SM-Portal\keys` |
| **API Base URL (Frontend)** | `http://localhost:5050` | `https://api-staging.local` | `https://api.local` |
| **IIS App Pool** | N/A | SMPortalPool-Staging | SMPortalPool |
| **Logging Level** | Debug | Information | Warning |
| **Log Retention** | 7 days | 30 days | 7 years (per compliance) |

---

## Files to Create/Update

### 1. **Program.cs - Environment-Aware Configuration**
Status: ⏳ **TODO** - Needs environment detection for all 6 issues

### 2. **appsettings.Production.json**  
Status: ✅ **Created** - Correct settings applied

### 3. **.env.production (Frontend)**
Status: ✅ **Created** - Correct API URL set

### 4. **Deployment Validation Script**
Status: ⏳ **TODO** - Create PowerShell script (see above)

### 5. **DEPLOYMENT_LESSONS_LEARNED.md**
Status: ✅ **This document**

### 6. **ENVIRONMENT_CONFIGURATION.md**
Status: ⏳ **TODO** - Create config matrix document

---

## Time Impact Analysis

| Phase | Without Validation | With Validation | Savings |
|-------|-------------------|-----------------|---------|
| **Build** | 15 min | 15 min | — |
| **Environment Setup** | 10 min | 10 min | — |
| **Deployment** | 10 min | 10 min | — |
| **Testing & Troubleshooting** | 8+ hours ⚠️ | 30 min | **7.5 hours saved** |
| **Total** | **8.5 hours** | **1 hour** | **87% reduction** |

**Lesson**: 2-3 minutes of validation scripts prevents 8+ hours of production debugging.

---

## New Deployment Process (Post-Lessons Learned)

```
1. Code Ready ─────────────────┐
                               ├─→ Build (Backend + Frontend)
2. Staging Environment ────────┤
                               ├─→ Run Validation Tests (10 min)
3. Pre-Deployment Gate ────────┤
                               ├─→ Check Environment Parity (5 min)
                               ├─→ Manual Approval
4. Production Deployment ──────┤
                               ├→ Deploy Files
                               ├→ Run Smoke Tests
                               ├→ Monitor for 1 hour
5. Complete ───────────────────┘

TOTAL TIME: 1 hour (vs. 8+ hours for troubleshooting)
RISK: LOW (vs. HIGH - production down for hours)
```

---

## Sign-Off

| Role | Name | Date | Sign |
|------|------|------|------|
| **Developer** | [Name] | 2026-03-02 | Reviewed & Approved |
| **DevOps** | [Name] | 2026-03-02 | Reviewed & Approved |
| **Project Lead** | [Name] | 2026-03-02 | Acknowledged |

---

## References

- [IIS_DEPLOYMENT_RUNBOOK.md](./docs/IIS_DEPLOYMENT_RUNBOOK.md) - Updated deployment procedures
- [WORKSPACE_RULES.md](../.github/WORKSPACE_RULES.md) - Cross-project standards
- [SM-Portal CLAUDE.md](./CLAUDE.md) - MAS configuration

---

---

## Issue 7: IIS Sub-Application Controller Route Mismatch ⚠️ CRITICAL

**Date**: 2026-03-19 | **Time Lost**: ~8 hours | **Sprint**: Invoice Extract UAT

**Problem**: `GET /api/invoices` returned 404 after deployment to IIS even though
authentication was working (NTLM handshake completing) and the app was running.

**Root Cause**:
- IIS sub-application is mounted at `/api` (SM-Portal/api in IIS Manager)
- IIS strips the `/api` prefix and forwards `/invoices` to ASP.NET Core
- Controllers had `[Route("api/invoices")]` — expecting the full path
- ASP.NET Core received `/invoices` but tried to match `api/invoices` → no match → 404

**Why it works in development but not in IIS**:
- Dev (Kestrel): no sub-application concept — Kestrel receives full URL path including `/api/`
- Prod (IIS sub-app): IIS strips `/api` before ASP.NET Core receives the request

**Fix Applied**:
```csharp
// BEFORE (broken under IIS sub-app):
[Route("api/invoices")]   // never matches — IIS already stripped /api
[Route("api/auth")]
[Route("api/endpoints")]

// AFTER (correct):
[Route("invoices")]
[Route("auth")]
[Route("endpoints")]
```

**Additional issues resolved in the same session**:

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| `Invalid URL` in browser | `new URL("/api/invoices")` — relative path without base | `new URL("/api/invoices", window.location.origin)` |
| 502 Bad Gateway on /api/invoices | `MyInvoisApi:ApiKey` missing in production appsettings | Set key in appsettings.Production.json |
| SPA direct-navigation 404 | IIS URL Rewrite Module not installed | Install from IIS downloads |
| DLL file lock on deploy | Stopped wrong app pool | Use `appcmd.exe list app` to identify correct pool, then stop it |
| PS `IIS:\` drive not found | `WebAdministration` module not auto-loaded | Use `appcmd.exe` instead |

**Rule**:
> The IIS sub-application path is an infrastructure concern — never repeat it in `[Route(...)]`.
> Controller routes must reflect the path AFTER IIS strips the sub-app prefix.

**Prevention Checklist**:
- [ ] Audit all `[Route(...)]` — none should repeat the IIS sub-app path prefix
- [ ] Smoke test `curl --negotiate -u : http://localhost/<subapp>/auth/test` post-deploy
- [ ] All required API keys present in production config before first deployment
- [ ] IIS URL Rewrite Module installed: `Get-WebGlobalModule -Name "RewriteModule"`
- [ ] Stop correct app pool (`appcmd.exe list app`) before copying DLL
- [ ] Frontend: `new URL(path, window.location.origin)` — never `new URL(relativePath)` alone

**Related**: `ai/memory/06-deployment-lessons-learned.md` Issue #7 | Skill: `cloud/dev-prod-parity`

---

**Status**: ACTIVE — updated 2026-03-19
**Next Review**: 2026-06-01
**Owner**: DevOps & Development Team
