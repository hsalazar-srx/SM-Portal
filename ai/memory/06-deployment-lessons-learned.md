# SM-Portal Deployment: Lessons Learned

**Date**: March 2, 2026  
**Duration**: 8+ hours of troubleshooting  
**Status**: CRITICAL GAPS IDENTIFIED & RESOLVED  
**Session**: Initial Production Deployment  

---

## Executive Summary

The SM-Portal IIS deployment encountered **6 critical configuration gaps** between development and production environments that consumed 8+ hours of troubleshooting. All issues were environment-specific (not code bugs) and could have been prevented with proper environment parity checks and automated validation.

**Root Cause**: Development used `dotnet run` (Kestrel) with relative paths and localhost bindings, but production required IIS-specific configuration (app pools, authentication, content root paths) that were not validated before deployment.

---

## Critical Issues & Solutions

### Issue #1: Content Root Path Mismatch ⚠️ CRITICAL

**Problem**: Backend app looked for `config/endpoint-registry.json` at relative path `./config/`, but in IIS this resolved to `C:\inetpub\wwwroot\config\` instead of the correct `C:\inetpub\wwwroot\SM-Portal\config\`, causing `DirectoryNotFoundException` on every request.

**Root Cause**: 
- Development: `AppDomain.CurrentDomain.BaseDirectory` = project root
- IIS: `AppDomain.CurrentDomain.BaseDirectory` = `C:\inetpub\wwwroot\` (wrong parent)

**Fix Applied**:
```csharp
// Set content root BEFORE WebApplication initialization
var contentRoot = Environment.GetEnvironmentVariable("ASPNETCORE_CONTENTROOT") 
    ?? (Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Production"
        ? @"C:\inetpub\wwwroot\SM-Portal"
        : Directory.GetCurrentDirectory());

builder.Host.UseContentRoot(contentRoot);
```

**Prevention Checklist**:
- ✅ Set `ASPNETCORE_CONTENTROOT` environment variable in IIS web.config
- ✅ Use `Environment.ContentRootPath` (not relative paths) for file operations
- ✅ Add deployment validation test that loads config files in IIS
- ✅ Document all relative path conversions

**Related Skill**: `cloud/aspnet-core-iis-configuration` v1.0

---

### Issue #2: Negotiate Authentication Conflicts with IIS Windows Auth ⚠️ CRITICAL

**Problem**: Code used `AddNegotiate()` handler, but IIS had Windows Authentication enabled, causing conflict and "The Negotiate Authentication handler cannot be used on a server that directly supports Windows Authentication" error.

**Root Cause**:
- Development: Kestrel + Negotiate works fine
- Production: IIS Windows Auth already built-in, Negotiate causes conflict

**Fix Applied**:
```csharp
if (app.Environment.IsProduction())
{
    // IIS handles auth natively
    builder.Services.AddAuthentication(IISDefaults.AuthenticationScheme);
    builder.Services.AddAuthorization();
}
else
{
    // Dev: Use Negotiate with Kestrel
    builder.Services.AddAuthentication(NegotiateDefaults.AuthenticationScheme)
        .AddNegotiate();
}
```

**Prevention Checklist**:
- ✅ Document: "Never use `AddNegotiate()` in IIS with Windows Auth enabled"
- ✅ Add environment-specific auth integration tests
- ✅ Add pre-deployment checklist item: Verify authentication method for target environment
- ✅ Test Windows Auth in actual IIS environment before deploying

**Related Skill**: `cloud/aspnet-core-iis-configuration` v1.0

---

### Issue #3: Multiple App Pools Interfering ⚠️ HIGH

**Problem**: IIS site bound to **both** `DefaultAppPool` (.NET CLR v4.0) AND `SMPortalPool` (.NET 8), causing requests randomly routed to wrong pool with 500.35 errors.

**Root Cause**: Default IIS configuration assigned DefaultAppPool to new sites without automated validation.

**Fix Applied**:
```powershell
# Explicitly reassign to correct pool
& "C:\Windows\System32\inetsrv\appcmd.exe" set app "SM-Portal/" /applicationPool:"SMPortalPool"

# Verify only one pool assigned
$site = & "C:\Windows\System32\inetsrv\appcmd.exe" list app "SM-Portal/"
```

**Prevention Checklist**:
- ✅ Create deployment validation script that verifies correct app pool
- ✅ Create IIS setup script that builds complete configuration (pools, sites, bindings, auth) in one go
- ✅ Add pre-deployment test: Verify only one app pool assigned
- ✅ Document app pool requirements in IIS_DEPLOYMENT_RUNBOOK.md

**Related Skill**: `cloud/iis-deployment-automation` v1.0

---

### Issue #4: Kestrel Port Conflicts (InProcess Hosting) ⚠️ HIGH

**Problem**: App used `app.UseKestrel()` with hardcoded port 5050, but IIS InProcess mode conflicts with Kestrel binding, causing `SocketException (10013)` - port access denied.

**Root Cause**:
- Development: Kestrel requires configuration
- IIS InProcess: **IIS handles port binding**, app should NOT configure Kestrel

**Fix Applied**:
```json
// appsettings.Production.json - REMOVE Kestrel section
{
  "Logging": { /* ... */ },
  // NO Kestrel section for IIS InProcess hosting!
}
```

**Prevention Checklist**:
- ✅ Add validation: Verify no Kestrel URL config in Production appsettings
- ✅ Document: "For IIS InProcess hosting, remove Kestrel Endpoints section"
- ✅ Add pre-deployment test: Attempt to start app in IIS, verify no port binding errors
- ✅ Create environment-specific appsettings validation

**Related Skill**: `cloud/aspnet-core-iis-configuration` v1.0

---

### Issue #5: Frontend/Backend Routing Conflict ⚠️ MEDIUM

**Problem**: Frontend deployed to `/SMPortal` sub-path but called backend API at `/SMPortal/api/health`, while backend was at root `/api/health`.

**Root Cause**: Frontend environment variable `VITE_API_URL` not set for Production, defaulted to hardcoded `http://localhost:5050`.

**Fix Applied**:
```bash
# .env.production  
VITE_API_URL=http://localhost/api

# Build process
npm run build  # Uses .env.production at build time
```

**Prevention Checklist**:
- ✅ Create ALL environment files BEFORE deployment: .env.production, .env.staging, .env.development
- ✅ Add build-time validation: Verify `VITE_API_URL` is set during build
- ✅ Document: "Frontend must use environment variables for API endpoints"
- ✅ Add pre-deployment test: Verify frontend can reach backend API
- ✅ Add frontend build validation to CI/CD

**Related Skill**: `cloud/environment-parity-validation` v1.0

---

### Issue #6: Data Protection Keys Not Persisted ⚠️ MEDIUM

**Problem**: App used ASP.NET Core Data Protection but didn't configure persistence. Keys stored in ephemeral location → lost on app restart, breaking auth tokens after IIS recycle.

**Root Cause**:
- Development: Local temp storage OK for testing
- Production: Keys must persist to disk or registry

**Fix Applied**:
```csharp
builder.Services.AddDataProtection()
    .PersistKeysToFileSystem(new DirectoryInfo(@"C:\inetpub\SM-Portal\keys"))
    .SetApplicationName("SM-Portal");
```

**Prevention Checklist**:
- ✅ Always configure `DataProtection` persistence for IIS/cloud deployments
- ✅ Grant app pool write access to keys folder
- ✅ Add pre-deployment test: Verify no "ephemeral repository" warnings in logs
- ✅ Document key storage location in environment configuration matrix
- ✅ Add folder creation and NTFS permissions to deployment script

**Related Skill**: `cloud/aspnet-core-iis-configuration` v1.0

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

**Root Cause**: Code assumed development environment behavior would work in production without explicit environment detection.

**Prevention**: Implement "Environment Parity Validation" checks before ANY production deployment.

---

## Immediate Actions Taken

| Action | Status | Date | Evidence |
|--------|--------|------|----------|
| Identified 6 critical gaps | ✅ Complete | 2026-03-02 | This document |
| Applied production fixes | ✅ Complete | 2026-03-02 | Program.cs, appsettings.Production.json |
| Created environment matrix | ✅ Complete | 2026-03-02 | 08-environment-configuration.md |
| Documented fixes with examples | ✅ Complete | 2026-03-02 | This document |

---

## Recommended Short-Term Actions

**This Week**:
- [ ] Create & run deployment validation script (see ai/checklists/pre-deployment-iis-validation.md)
- [ ] Add pre-deployment checklist documentation
- [ ] Document all environment differences in environment configuration matrix
- [ ] Run validation on current production deployment to confirm fixes work

**This Sprint**:
- [ ] Add integration tests for environment-specific code paths
- [ ] Create environment configuration templates for staging/production
- [ ] Set up CI/CD validation that runs pre-deployment checks automatically
- [ ] Create IIS configuration PowerShell module for repeatability

**Next Quarter**:
- [ ] Implement Infrastructure as Code (Terraform/Ansible) to build IIS configuration
- [ ] Add production smoke tests that run after deployment
- [ ] Create IIS golden image with SM-Portal pre-configured

---

## Knowledge Base References

- **Environment Configuration**: See `08-environment-configuration.md`
- **Validation Procedures**: See `docs/runbooks/iis-environment-parity-validation.md`
- **Deployment Runbook**: See `docs/IIS_DEPLOYMENT_RUNBOOK.md`
- **Pre-Deployment Checklist**: See `ai/checklists/pre-deployment-iis-validation.md`
- **Code Patterns**: See `ai/patterns/aspnet-core-iis-configuration.md`

---

## Related Skills

These skills were identified during this incident and should be developed:

1. **cloud/iis-deployment-automation** - Automated IIS site/app pool configuration
2. **cloud/aspnet-core-iis-configuration** - ASP.NET Core environment-aware IIS configuration
3. **cloud/environment-parity-validation** - Validation gates to prevent environment mismatches

See `.github/skills/manifest.json` for full skill definitions.

---

**Next Review**: When deploying to new environments (staging, additional production servers)
**Owner**: DevOps Team
**Last Updated**: 2026-03-19

---

### Issue #7: IIS Sub-Application Controller Route Mismatch ⚠️ CRITICAL

**Date**: 2026-03-19 | **Time Lost**: ~8 hours

**Problem**: `GET /api/invoices` returned 404 after deployment to IIS even though
authentication was working (NTLM handshake completing) and the app was running.

**Root Cause**:
- IIS sub-application is mounted at `/api` (SM-Portal/api in IIS Manager)
- IIS strips the `/api` prefix and forwards `/invoices` to ASP.NET Core
- Controllers had `[Route("api/invoices")]` — expecting the full path
- ASP.NET Core received `/invoices` but tried to match `api/invoices` → no match → 404

**Development vs Production gap**:
- Dev (Kestrel, no sub-app): browser calls `http://localhost:5050/api/invoices`
  → Kestrel receives full path → `[Route("api/invoices")]` matches ✅
- Prod (IIS sub-app at `/api`): browser calls `http://server/api/invoices`
  → IIS routes to sub-app, ASP.NET Core sees `GET /invoices`
  → `[Route("api/invoices")]` does NOT match `/invoices` → 404 ❌

**Fix Applied**:
```csharp
// BEFORE (broken in IIS sub-app):
[Route("api/invoices")]
[Route("api/auth")]
[Route("api/endpoints")]

// AFTER (correct for IIS sub-app):
[Route("invoices")]
[Route("auth")]
[Route("endpoints")]
```
The `/api` segment is provided by the IIS sub-application path — do not repeat it in routes.

**Also fixed in same session**:
- `new URL("/api/invoices")` missing base argument → `Invalid URL` browser exception
  Fix: `new URL("/api/invoices", window.location.origin)`
- Missing `MyInvoisApi:ApiKey` in production appsettings → 502 Bad Gateway
- IIS URL Rewrite Module not installed → SPA direct-navigation returned 404
- `WebAdministration` PS module unavailable → use `appcmd.exe` instead
- DLL file lock: stopped wrong app pool; use `appcmd.exe list app` to find correct one

**Rule**:
> When ASP.NET Core runs as an IIS sub-application, the sub-app path prefix is an
> IIS concern — never repeat it in `[Route(...)]` attributes. Controller routes must
> reflect the path AFTER IIS strips the prefix.

**Prevention Checklist**:
- [ ] All `[Route(...)]` attributes must NOT include the IIS sub-application prefix
- [ ] Smoke test `GET /<subapp>/auth/test` from server immediately after deploy (`curl --negotiate`)
- [ ] All required API keys (e.g., `MyInvoisApi:ApiKey`) present in production appsettings before first run
- [ ] IIS URL Rewrite Module installed: `Get-WebGlobalModule -Name "RewriteModule"`
- [ ] Use `appcmd.exe` to inspect IIS config when WebAdministration module unavailable
- [ ] Stop the CORRECT app pool (verify with `appcmd.exe list app`) before replacing DLL
- [ ] Frontend: `new URL(path, window.location.origin)` — never `new URL(relativePath)` alone

**Related Skill**: `cloud/dev-prod-parity` v1.0.0
