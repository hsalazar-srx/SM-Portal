# Environment Configuration Matrix & Standards

**Version**: 1.0  
**Last Updated**: 2026-03-02  
**Applies To**: SM-Portal Backend & Frontend  

---

## Overview

This document defines EXACT configuration differences between development, staging, and production environments. **This matrix MUST be consulted before ANY environment-specific configuration change.**

---

## Configuration Matrix

| Setting | Development | Staging | Production |
|---------|-------------|---------|-----------|
| **ASPNETCORE_ENVIRONMENT** | Development | Staging | Production |
| **ASPNETCORE_CONTENTROOT** | `C:\Projects\SM-Portal` (relative) | `C:\inetpub\wwwroot\SM-Portal` | `C:\inetpub\wwwroot\SM-Portal` |
| **Hosting Model** | Kestrel (dotnet run) | IIS InProcess | IIS InProcess |
| **Authentication Method** | IISDefaults or Negotiate | Windows Auth (IIS native) | Windows Auth (IIS native) |
| **Negotiate Handler** | ✅ AddNegotiate() | ❌ REMOVE (IIS handles auth) | ❌ REMOVE (IIS handles auth) |
| **Kestrel Configuration** | Required: `http://localhost:5050` | ❌ Remove Kestrel section | ❌ Remove Kestrel section |
| **Data Protection Keys** | Ephemeral OK (temp storage) | `C:\staging\keys` (persistent) | `C:\inetpub\SM-Portal\keys` (persistent) |
| **IIS App Pool** | N/A | `SMPortalPool-Staging` (.NET 8) | `SMPortalPool` (.NET 8) |
| **IIS Site Binding** | N/A | https://api-staging.local:443 | https://api.local:443 |
| **Frontend API URL** | http://localhost:5050 | https://api-staging.local | https://api.local |
| **Connection String** | LocalDB`(localdb)\mssqllocaldb` | Staging SQL Server 2022 | Production SQL Server 2022 |
| **Logging Level** | Debug | Information | Warning |
| **Log Output** | Console + File | File + Event Log | Event Log only |
| **Log Retention** | 7 days (OK to delete) | 30 days | **7 years (COMPLIANCE)** |
| **Audit Database** | `SRX_AuditLog_Dev` | `SRX_AuditLog_Staging` | `SRX_AuditLog_Prod` |
| **Encryption at Rest** | None (Dev) | TDE enabled | TDE enabled (COMPLIANCE) |
| **TLS Version** | 1.2+ (Kestrel) | TLS 1.2+ (IIS) | TLS 1.2+ (IIS) |
| **File Permissions** | User running VS (dev) | IIS AppPool account | IIS AppPool account |

---

## Critical Configuration Rules

### ❌ NEVER DO

1. **Never commit secrets to source control**
   - Use User Secrets (dev) or Azure Key Vault (prod)
   - Pattern: Don't commit connection strings to appsettings.json

2. **Never use Kestrel in IIS InProcess mode**
   - Remove `Kestrel` section from appsettings.Production.json
   - IIS manages the port binding—app should NOT
   
3. **Never skip Data Protection key persistence**
   - Production must persist keys: `C:\inetpub\SM-Portal\keys`
   - Ephemeral keys cause session loss on app restart

4. **Never use AddNegotiate() with IIS Windows Auth**
   - IIS has Windows Auth built-in
   - Using both causes authentication conflicts

5. **Never use relative file paths**
   - Use `IHostEnvironment.ContentRootPath` or environment variables
   - IIS base directory != project directory

---

### ✅ ALWAYS DO

1. **Always set ASPNETCORE_CONTENTROOT in web.config for IIS**
   ```xml
   <environmentVariables>
     <environmentVariable name="ASPNETCORE_CONTENTROOT" 
                         value="C:\inetpub\wwwroot\SM-Portal" />
   </environmentVariables>
   ```

2. **Always verify app pool assignment**
   ```powershell
   & "C:\Windows\System32\inetsrv\appcmd.exe" list app "SM-Portal"
   # Should show: SMPortalPool (not DefaultAppPool)
   ```

3. **Always test config in target environment**
   - Before deploying to production, test appsettings.Production.json locally
   - Before deploying to staging, test appsettings.Staging.json locally

4. **Always grant IIS AppPool write permissions**
   - Data Protection keys folder: `C:\inetpub\SM-Portal\keys`
   - Audit log write access: SQL Server connection
   - Log file directory: `C:\inetpub\SM-Portal\logs`

5. **Always run validation checklist before deployment**
   - See: `ai/checklists/pre-deployment-iis-validation.md`

---

## appsettings Configuration Files

### appsettings.json (Shared Base)

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft": "Warning"
    }
  },
  "ConnectionStrings": {
    "AuditLog": "Server=.;Database=SRX_AuditLog;Integrated Security=true;"
  },
  "DataProtection": {
    "KeyStoragePath": "."  // Will be overridden per environment
  }
}
```

### appsettings.Development.json

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Debug",
      "Microsoft": "Debug"
    }
  },
  "Kestrel": {
    "Endpoints": {
      "Http": {
        "Url": "http://localhost:5050"
      }
    }
  },
  "DataProtection": {
    "KeyStoragePath": "./temp/keys"
  }
}
```

### appsettings.Staging.json

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information"
    }
  },
  "DataProtection": {
    "KeyStoragePath": "C:\\staging\\keys"
  },
  "Authentication": {
    "Scheme": "Windows"
  }
}
// NO Kestrel section! IIS manages port.
```

### appsettings.Production.json

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Warning"
    }
  },
  "ConnectionStrings": {
    "AuditLog": "Server=PROD-SQL-01;Database=SRX_AuditLog_Prod;Integrated Security=true;TrustServerCertificate=false;Encrypt=true;"
  },
  "DataProtection": {
    "KeyStoragePath": "C:\\inetpub\\SM-Portal\\keys"
  },
  "Authentication": {
    "Scheme": "Windows"
  }
}
// NO Kestrel section! IIS manages port.
```

---

## Environment Variables

### IIS web.config AppSettings

```xml
<configuration>
  <system.webServer>
    <aspNetCore processPath="dotnet" arguments=".\SM-Portal.dll" 
                hostingModel="InProcess" />
    
    <environmentVariables>
      <!-- CRITICAL: Set content root for file operations -->
      <environmentVariable name="ASPNETCORE_CONTENTROOT" 
                           value="C:\inetpub\wwwroot\SM-Portal" />
      
      <!-- Set environment to Production -->
      <environmentVariable name="ASPNETCORE_ENVIRONMENT" 
                           value="Production" />
      
      <!-- For Azure Key Vault access (if used) -->
      <environmentVariable name="KEYVAULT_NAME" 
                           value="srx-prod-vault" />
    </environmentVariables>
  </system.webServer>
</configuration>
```

---

## Frontend Environment Files

### .env.development

```bash
VITE_API_URL=http://localhost:5050
VITE_ENV=development
VITE_LOG_LEVEL=debug
```

### .env.staging

```bash
VITE_API_URL=https://api-staging.local
VITE_ENV=staging
VITE_LOG_LEVEL=info
```

### .env.production

```bash
VITE_API_URL=https://api.local
VITE_ENV=production
VITE_LOG_LEVEL=warning
```

**Important**: These files control the build output. Frontend must be re-built after changing environment:

```bash
npm run build  # Uses .env.production at build time
```

---

## Deployment Validation Gates

**Before deployment, verify:**

| Check | Development | Staging | Production |
|-------|-------------|---------|-----------|
| **Content Root Set** | ✅ Project root | ✅ C:\inetpub\wwwroot\SM-Portal | ✅ C:\inetpub\wwwroot\SM-Portal |
| **No Kestrel config in appsettings** | ❓ OK (Kestrel needed) | ✅ Removed | ✅ Removed |
| **Data Protection Keys persist** | ⚠️ Ephemeral | ✅ C:\staging\keys | ✅ C:\inetpub\SM-Portal\keys |
| **App Pool is correct** | N/A | ✅ SMPortalPool-Staging | ✅ SMPortalPool |
| **Only one app pool assigned** | N/A | ✅ Verify | ✅ Verify |
| **Auth method matches environment** | ✅ Kestrel/Negotiate | ✅ Windows/IIS | ✅ Windows/IIS |
| **Frontend API URL is correct** | ✅ localhost:5050 | ✅ api-staging.local | ✅ api.local |
| **TLS 1.2+ enabled** | ✅ | ✅ | ✅ |
| **Encryption at rest (TDE)** | ⚠️ Not required | ✅ Enabled | ✅ Enabled |

---

## Troubleshooting by Error

### Error: "DirectoryNotFoundException: config/endpoint-registry.json"

**Cause**: Relative path used, content root not set correctly

**Fix**:
1. Verify `ASPNETCORE_CONTENTROOT` environment variable in web.config
2. Or: Use `IHostEnvironment.ContentRootPath` in code instead of `./`

### Error: "The Negotiate Authentication handler cannot be used..."

**Cause**: `AddNegotiate()` + IIS Windows Auth enabled simultaneously

**Fix**:
1. Remove `AddNegotiate()` from Program.cs in Production
2. Use `IISDefaults.AuthenticationScheme` instead

### Error: "SocketException (10013): Port access denied"

**Cause**: Kestrel configuration in IIS InProcess mode

**Fix**:
1. Remove `Kestrel` section from appsettings.Production.json
2. IIS manages the port—app should not configure one

### Warning: "Neither user profile nor HKLM registry available"

**Cause**: Data Protection keys not configured to persist

**Fix**:
1. Use `PersistKeysToFileSystem()` in Program.cs
2. Grant IIS AppPool write access to keys folder

### API returns 500 with "authentication scheme was not accepted by the server"

**Cause**: Frontend calling API with wrong scheme or credentials not passed

**Fix**:
1. Verify `VITE_API_URL` is set correctly and built into frontend
2. Verify Windows Auth is enabled on IIS site
3. Test with browser's Windows auth: `Invoke-WebRequest -Uri $url -UseDefaultCredentials`

---

## Related Documentation

- **Deployment Runbook**: [IIS_DEPLOYMENT_RUNBOOK.md](../../docs/IIS_DEPLOYMENT_RUNBOOK.md)
- **Validation Procedures**: [docs/runbooks/iis-environment-parity-validation.md](../../docs/runbooks/iis-environment-parity-validation.md)
- **Pre-Deployment Checklist**: [ai/checklists/pre-deployment-iis-validation.md](../checklists/pre-deployment-iis-validation.md)
- **Lessons Learned**: [ai/memory/06-deployment-lessons-learned.md](06-deployment-lessons-learned.md)

---

**Ownership**: DevOps Team  
**Review Frequency**: Before each new environment deployment  
**Last Review**: 2026-03-02
