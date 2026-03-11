# Pre-Deployment IIS Validation Checklist

**Purpose**: Ensure zero unplanned production disruptions by validating environment parity BEFORE deployment  
**Owner**: DevOps Team  
**Frequency**: Before EVERY deployment to Staging/Production  
**Time Required**: 15–20 minutes  

---

## Pre-Deployment: Configuration Validation

### Application Configuration

- [ ] **appsettings.{Environment}.json is present**
  - [ ] appsettings.Staging.json exists
  - [ ] appsettings.Production.json exists
  - Both should NOT have `Kestrel` section

- [ ] **No Kestrel configuration in production appsettings**
  ```bash
  grep -i "kestrel" src/appsettings.Production.json  # Should return nothing
  ```

- [ ] **Data Protection key storage is configured**
  - [ ] Program.cs calls `PersistKeysToFileSystem()` with correct path
  - [ ] Path exists: `C:\inetpub\SM-Portal\keys` (Production)
  - [ ] IIS AppPool has write permission on keys folder

- [ ] **ASPNETCORE_CONTENTROOT environment variable will be set in web.config**
  - [ ] Value set to: `C:\inetpub\wwwroot\SM-Portal`
  - [ ] Or: Code uses `IHostEnvironment.ContentRootPath` (not hardcoded relative paths)

- [ ] **Authentication correctly configured for environment**
  - [ ] No `AddNegotiate()` in Production code (or guarded with `!app.Environment.IsProduction()`)
  - [ ] IISDefaults used for Production auth
  - [ ] Windows Auth enabled on IIS site (if using Windows Auth)

### Frontend Configuration

- [ ] **Frontend .env.{environment} file exists**
  - [ ] .env.production exists with correct `VITE_API_URL`
  - [ ] Example: `VITE_API_URL=https://api.local` (NOT localhost)

- [ ] **Frontend is built with correct environment**
  ```bash
  cd frontend
  npm run build  # Uses .env.production at build time
  # Verify in dist/index.html that API URL is correct (not localhost:5050)
  grep -o "localhost:5050" dist/index.html || echo "✅ No hardcoded localhost found"
  ```

### Secrets & Keys Management

- [ ] **No secrets in source code**
  ```bash
  git log -S "password" -S "secret" -S "key" --source --all | head -5
  # Should be empty or only show user-secrets references
  ```

- [ ] **Connection strings are in User Secrets (dev) or Key Vault (prod)**
  - Not in appsettings.json
  - [ ] Staging connection string correct: `Server=STAGING-SQL;Database=SRX_AuditLog_Staging`
  - [ ] Production connection string correct: `Server=PROD-SQL;Database=SRX_AuditLog_Prod`

---

## Pre-Deployment: IIS Configuration Validation

### IIS Site & App Pool Setup

- [ ] **IIS site exists with correct name**
  ```powershell
  & "C:\Windows\System32\inetsrv\appcmd.exe" list site "SM-Portal"
  # Should show: SM-Portal
  ```

- [ ] **Only ONE app pool is assigned to the site**
  ```powershell
  & "C:\Windows\System32\inetsrv\appcmd.exe" list app "SM-Portal"
  # Should show ONLY: SMPortalPool (not DefaultAppPool + SMPortalPool)
  ```

- [ ] **App pool is .NET 8 (not .NET 4.0 CLR)**
  ```powershell
  & "C:\Windows\System32\inetsrv\appcmd.exe" list apppool "SMPortalPool" /text:*
  # Should show: managedRuntimeVersion: (empty for .NET Core)
  ```

- [ ] **App pool is in "Started" state**
  ```powershell
  & "C:\Windows\System32\inetsrv\appcmd.exe" list apppool "SMPortalPool" /text:state
  # Should show: Started
  ```

- [ ] **IIS site binding is correct for environment**
  - [ ] Staging: `https://api-staging.local:443`
  - [ ] Production: `https://api.local:443`
  ```powershell
  & "C:\Windows\System32\inetsrv\appcmd.exe" list binding "SM-Portal"
  ```

### IIS Authentication & Security

- [ ] **Windows Authentication is enabled on IIS site**
  ```powershell
  & "C:\Windows\System32\inetsrv\appcmd.exe" list config "SM-Portal" /section:windowsAuthentication
  # Should show: enabled="true"
  ```

- [ ] **HTTPS/TLS 1.2+ is enforced**
  ```powershell
  Get-Item 'HKLM:\SYSTEM\CurrentControlSet\Control\SecurityProviders\SCHANNEL\Protocols\TLS 1.2\Server'
  # Should exist with Enabled: 1 and DisabledByDefault: 0
  ```

### IIS File Permissions

- [ ] **IIS AppPool account has read access to SM-Portal folder**
  ```powershell
  $acl = Get-Acl "C:\inetpub\wwwroot\SM-Portal"
  # Should show AppPool account with at least (R)ead
  ```

- [ ] **IIS AppPool has write access to keys folder**
  ```powershell
  $acl = Get-Acl "C:\inetpub\wwwroot\SM-Portal\keys"
  # Should show AppPool account with (M)odify permission
  $privs = $acl.Access | Where-Object { $_.IdentityReference -match "AppPool" }
  $privs.FileSystemRights  # Should include "Modify"
  ```

- [ ] **IIS AppPool has write access to logs folder (if applicable)**
  ```powershell
  $acl = Get-Acl "C:\inetpub\wwwroot\SM-Portal\logs"
  # Should show AppPool account with (M)odify
  ```

---

## Pre-Deployment: Environment Variables

- [ ] **ASPNETCORE_ENVIRONMENT is set in web.config**
  ```xml
  <!-- Check IIS > SM-Portal > Environment Variables -->
  ASPNETCORE_ENVIRONMENT = Staging (or Production)
  ```

- [ ] **ASPNETCORE_CONTENTROOT is set in web.config**
  ```xml
  ASPNETCORE_CONTENTROOT = C:\inetpub\wwwroot\SM-Portal
  ```

- [ ] **All required Key Vault secrets are accessible**
  - [ ] Test Key Vault connection (if using Azure Key Vault)
  ```powershell
  $vault = Get-AzKeyVault -VaultName "srx-prod-vault" -ErrorAction Stop
  # Should succeed with no auth errors
  ```

---

## Pre-Deployment: Build & Test Validation

### Code Build Validation

- [ ] **Project builds without errors**
  ```bash
  cd src
  dotnet build -c Release
  # Should show: "Build succeeded"
  ```

- [ ] **No warnings that indicate configuration issues**
  ```bash
  # Build output should NOT contain:
  # - "The Negotiate Authentication handler cannot be used..."
  # - "DirectoryNotFoundException"
  # - "Neither user profile nor HKLM registry available"
  ```

### Unit & Integration Tests

- [ ] **All unit tests pass**
  ```bash
  dotnet test -c Release
  # Should show: "Test Run Successful"
  ```

- [ ] **IIS-specific integration tests pass**
  - Test that loads config files (ensures ASPNETCORE_CONTENTROOT works)
  - Test that Windows Auth works (if configured)
  - Test that DataProtection keys persist (app restart doesn't lose auth)

### Configuration Load Test

- [ ] **Configuration loads without errors in target environment**
  ```bash
  dotnet run --configuration Release --environment Production --validate-only
  # Should show: "Configuration validated successfully"
  # Or: Exit without exceptions
  ```

---

## Deployment: Pre-Flight Checks (5 minutes before deployment)

- [ ] **Current time is within deployment window**
  - [ ] Staging: Any time (dev environment)
  - [ ] Production: During scheduled maintenance window
  - [ ] Owner: _______________  Approval: _____________

- [ ] **Deployment team is ready**
  - [ ] DevOps engineer confirmed
  - [ ] Runbook reviewed
  - [ ] Rollback plan reviewed

- [ ] **Rollback plan is ready**
  - [ ] Previous version is available
  - [ ] Rollback tested in staging
  - [ ] Rollback time estimate: _____ minutes
  - [ ] Owner: _______________

- [ ] **Communication is ready**
  - [ ] Notification scheduled to stakeholders
  - [ ] Support team notified
  - [ ] Incident contact is on-call: _______________

---

## Deployment: Post-Flight Checks (immediately after deployment)

### Functional Validation

- [ ] **IIS site responds to health check**
  ```powershell
  Invoke-WebRequest -Uri "https://api.local/health" -UseDefaultCredentials
  # Should return: 200 OK
  ```

- [ ] **Frontend loads and displays correctly**
  - [ ] Open browser: `https://sm-portal.local`
  - [ ] Page loads without 404 or 500 errors
  - [ ] No console errors in DevTools

- [ ] **Authentication works**
  - [ ] Log in with Windows credentials
  - [ ] Should NOT prompt for credentials (Windows Auth should be automatic)

- [ ] **Backend API responds**
  ```powershell
  Invoke-WebRequest -Uri "https://api.local/api/endpoints" -UseDefaultCredentials
  # Should return: 200 OK with JSON list
  ```

### Log Validation

- [ ] **No errors in Event Log**
  ```powershell
  Get-EventLog -LogName Application -Source "SM-Portal" -EntryType Error -Newest 20
  # Should be empty or show only old errors
  ```

- [ ] **No authentication errors in logs**
  ```powershell
  # Check for:
  # - "401 Unauthorized"
  # - "authentication scheme was not accepted"
  ```

- [ ] **No "ephemeral" warnings about Data Protection keys**
  ```powershell
  Get-EventLog -LogName Application -Message "*ephemeral*" -Newest 10
  # Should be empty
  ```

- [ ] **No path not found errors**
  ```powershell
  Get-EventLog -LogName Application -Message "*DirectoryNotFoundException*" -Newest 10
  # Should be empty
  ```

### Performance Validation

- [ ] **Response times are acceptable**
  - [ ] Health check: < 200ms
  - [ ] API call: < 500ms
  - [ ] Frontend page load: < 2 sec

- [ ] **No connection pool exhaustion**
  - [ ] Check SQL Server: `SELECT COUNT(*) FROM sys.dm_exec_sessions`
  - [ ] Should be < 20 connections (if no other apps)

---

## Rollback Validation (if needed)

- [ ] **Previous version is available**
  ```bash
  git log --oneline -5  # Previous commits available
  ```

- [ ] **Rollback commands are ready**
  ```powershell
  # Example rollback steps documented in runbook
  & "C:\Windows\System32\inetsrv\appcmd.exe" recycle apppool "SMPortalPool"
  # Deploy previous release from backup
  ```

- [ ] **Rollback tested in staging**
  - [ ] Successfully deployed previous version
  - [ ] All tests passed on previous version

---

## Post-Deployment Monitoring (1 hour after deploy)

- [ ] **Error rate is normal**
  - [ ] Check Application Insights or log monitoring
  - [ ] Should be ≤ 0.1% error rate

- [ ] **No spike in CPU or memory**
  - [ ] Task Manager or Performance Monitor
  - [ ] CPU: < 50%, Memory: < 80%

- [ ] **Users can access the portal**
  - [ ] At least 1 user confirmed access
  - [ ] No widespread access issues reported

- [ ] **No SQL Server issues**
  - [ ] Query execution is normal
  - [ ] Connection pool is stable
  - [ ] Locks or deadlocks: None

---

## Sign-Off

| Role | Name | Date/Time | Signature |
|------|------|-----------|-----------|
| **DevOps Engineer** | _________ | ___/___/___ | _________ |
| **Dev Lead** | _________ | ___/___/___ | _________ |
| **Operations Manager** | _________ | ___/___/___ | _________ |

---

## Notes & Issues

```
[Space for any issues encountered during deployment]




```

---

## Lessons Learned (after deployment)

- **What went well?**
- **What could be improved?**
- **Any environment surprises?**
- **Update to memory files**: `ai/memory/06-deployment-lessons-learned.md`

---

**Document Location**: `ai/checklists/pre-deployment-iis-validation.md`  
**Last Updated**: 2026-03-02  
**Version**: 1.0  
