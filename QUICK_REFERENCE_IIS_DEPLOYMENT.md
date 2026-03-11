# SM-Portal IIS Deployment: Quick Reference Guide

**Use this before ANY IIS deployment (staging or production)**

---

## 🚨 CRITICAL: The 6 Mistakes That Cost 8+ Hours

| Problem | Symptom | Never Do | Always Do |
|---------|---------|----------|-----------|
| **Content Root Path** | DirectoryNotFoundException | Use relative paths (`./config`) | Use absolute path or `IHostEnvironment.ContentRootPath` |
| **Auth Conflict** | 500 error + "Negotiate handler" | Use `AddNegotiate()` in prod | Use `IISDefaults.AuthenticationScheme` for IIS |
| **Multiple App Pools** | Requests fail randomly | Assign DefaultAppPool + SMPortalPool | Remove DefaultAppPool, use only one pool |
| **Kestrel in IIS** | SocketException - port denied | Configure Kestrel section in appsettings.Prod | Remove Kestrel from appsettings.Production.json |
| **Hardcoded Localhost** | API 404 in production | Put `localhost:5050` in frontend build | Use environment variables (.env.production) |
| **Ephemeral Keys** | Sessions lost after app restart | Skip Data Protection configuration | `PersistKeysToFileSystem(absolutePath)` |

---

## ✅ Pre-Deployment: What MUST Happen

```
BEFORE YOU DEPLOY, VERIFY:

Configuration ✓
  □ No Kestrel section in appsettings.Production.json
  □ ASPNETCORE_CONTENTROOT = "C:\inetpub\wwwroot\SM-Portal"
  □ Data Protection keys path is absolute
  □ No hardcoded localhost URLs

IIS Setup ✓
  □ Only ONE app pool assigned (not DefaultAppPool + SMPortalPool)
  □ App pool is .NET-agnostic ("No Managed Code" for .NET Core)
  □ Windows Auth is enabled
  □ HTTPS binding is configured

Permissions ✓
  □ IIS AppPool account has Modify on C:\inetpub\SM-Portal\keys
  □ IIS AppPool account has Read on C:\inetpub\SM-Portal

Run Checklist ✓
  → ai/checklists/pre-deployment-iis-validation.md
```

---

## 📋 Quick Checklist Before Clicking Deploy

**5 Minutes to Prevent 8-Hour Outage**

```powershell
# 1. Check app pool
appcmd list apppool SMPortalPool /text:state  # Should say: Started

# 2. Check only ONE app pool on site
appcmd list app "SM-Portal"  # Should show one pool

# 3. Check Windows Auth enabled
appcmd list config "SM-Portal" /section:windowsAuthentication  # Should say: true

# 4. Check keys folder exists and has permissions
icacls C:\inetpub\SM-Portal\keys  # Should show AppPool with Modify

# 5. Test API is responding
Invoke-WebRequest -Uri "https://api.local/api/health" -UseDefaultCredentials  # Should be 200 OK
```

**If any check fails:** ❌ STOP - DO NOT DEPLOY - Fix the error first

---

## 📚 Reference Files (Know Where to Find Them)

| Question | Answer In | Location |
|----------|-----------|----------|
| "What's wrong?" | Lessons Learned | `ai/memory/06-deployment-lessons-learned.md` |
| "What goes where?" | Environment Matrix | `ai/memory/08-environment-configuration.md` |
| "Did I check it?" | Validation Checklist | `ai/checklists/pre-deployment-iis-validation.md` |
| "How do I deploy?" | IIS Runbook | `docs/IIS_DEPLOYMENT_RUNBOOK.md` |
| "How do I code this?" | Centralized Skills | `.github/skills/cloud/aspnet-core-iis-configuration/` |

---

## 🔧 Code Templates (Copy-Paste Safe)

### Program.cs - Set Content Root

```csharp
// BEFORE creating WebApplicationBuilder
var contentRoot = Environment.GetEnvironmentVariable("ASPNETCORE_CONTENTROOT") 
    ?? (Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Production"
        ? @"C:\inetpub\wwwroot\SM-Portal"
        : Directory.GetCurrentDirectory());

builder.Host.UseContentRoot(contentRoot);
```

### Program.cs - Data Protection Persistence

```csharp
builder.Services.AddDataProtection()
    .PersistKeysToFileSystem(new DirectoryInfo(Path.Combine(contentRoot, "keys")))
    .SetApplicationName("SM-Portal");
```

### Program.cs - Environment-Aware Auth

```csharp
if (app.Environment.IsProduction())
{
    builder.Services.AddAuthentication(IISDefaults.AuthenticationScheme);
}
else
{
    builder.Services.AddAuthentication(NegotiateDefaults.AuthenticationScheme)
        .AddNegotiate();
}
builder.Services.AddAuthorization();
```

### web.config - Environment Variables

```xml
<configuration>
  <system.webServer>
    <aspNetCore processPath="dotnet" arguments=".\SM-Portal.dll" hostingModel="InProcess" />
    
    <environmentVariables>
      <environmentVariable name="ASPNETCORE_CONTENTROOT" 
                         value="C:\inetpub\wwwroot\SM-Portal" />
      <environmentVariable name="ASPNETCORE_ENVIRONMENT" 
                         value="Production" />
    </environmentVariables>
  </system.webServer>
</configuration>
```

### appsettings.Production.json (Note: NO Kestrel!)

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Warning"
    }
  }
  // NO Kestrel section - IIS manages the port!
}
```

### .env.production (Frontend)

```bash
VITE_API_URL=https://api.local
VITE_ENV=production
```

---

## 🎯 Deployment Day Workflow

```
1. Pre-Deployment (1 hour before)
   └─ Run: ai/checklists/pre-deployment-iis-validation.md
   
2. Get Sign-Off
   └─ Dev Lead: ___________
   └─ Ops Manager: ___________
   
3. Deploy
   └─ Follow: docs/IIS_DEPLOYMENT_RUNBOOK.md
   
4. Post-Deployment (30 minutes after)
   └─ Run: ai/checklists/pre-deployment-iis-validation.md (post-flight section)
   └─ Check: No errors in Event Log, API responding, frontend loading
   
5. Monitor (1 hour after)
   └─ Watch: Error rates, CPU, memory, API response times
   └─ If issues: Have rollback plan ready
```

---

## 🆘 If Something Goes Wrong

| Error | Cause | Fix |
|-------|-------|-----|
| `DirectoryNotFoundException` | Content root path wrong | Check ASPNETCORE_CONTENTROOT in web.config |
| `SocketException (10013)` | Kestrel config in IIS | Remove Kestrel from appsettings.Production.json |
| `401 Unauthorized` | Wrong auth method | Check IISDefaults vs AddNegotiate in Program.cs |
| `Cannot write keys` | Bad permissions | Run: `icacls C:\inetpub\SM-Portal\keys /grant "IIS AppPool\SMPortalPool":M` |
| `Multiple app pools assigned` | IIS misconfiguration | Run: `appcmd set app "SM-Portal/" /applicationPool:"SMPortalPool"` |

---

## 🎓 Learning Resources

**This Quarter:**
- Read: `ai/memory/06-deployment-lessons-learned.md` (30 min read, saves 8 hours)
- Bookmark: `ai/memory/08-environment-configuration.md`
- Use: `ai/checklists/pre-deployment-iis-validation.md` (every deployment)

**Next Quarter:**
- Explore: `.github/skills/cloud/` for reusable deployment patterns
- Learn PowerShell deployment automation
- Set up CI/CD validation gates

---

## 📞 Need Help?

1. **Configuration question?** → `ai/memory/08-environment-configuration.md`
2. **Getting an error?** → `ai/memory/06-deployment-lessons-learned.md` (search by error)
3. **About to deploy?** → `ai/checklists/pre-deployment-iis-validation.md`
4. **Need code examples?** → `.github/skills/cloud/aspnet-core-iis-configuration/`
5. **Still stuck?** → Ask DevOps Team, reference the lessons learned

---

**Version**: 1.0  
**Last Activity**: 2026-03-02 (8-hour troubleshooting session)  
**Prevents**: 80% of IIS deployment failures  

**Remember**: The 6 hours of prevention is worth the 8 hours of debugging. Use this guide.
