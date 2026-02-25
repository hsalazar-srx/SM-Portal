# SM-Portal IIS Deployment Runbook

**Version**: 1.0  
**Last Updated**: Feb 25, 2026  
**Purpose**: Step-by-step guide for deploying SM-Portal backend API to IIS  
**Target Audience**: DevOps engineers, system administrators  
**Estimated Time**: 45-90 minutes (depending on environment)

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Pre-Deployment Checklist](#pre-deployment-checklist)
3. [Environment Setup](#environment-setup)
4. [Build Preparation](#build-preparation)
5. [IIS Configuration](#iis-configuration)
6. [Application Deployment](#application-deployment)
7. [Post-Deployment Verification](#post-deployment-verification)
8. [Troubleshooting](#troubleshooting)
9. [Rollback Procedures](#rollback-procedures)

---

## Prerequisites

### System Requirements

**Server:**
- Windows Server 2019 or later (2022 recommended)
- IIS 10.0 or later
- .NET 8.0 Hosting Bundle installed
- 4GB+ RAM
- SSD with 20GB+ free space
- Static IP address

**Software:**
- SQL Server 2019 or later (for audit logs)
- Windows AD integration (Kerberos/NTLM authentication)
- Git (for source control)
- PowerShell 7.0+

**Network:**
- Access to M3 MOVEX API (movex-rest-api running)
- HTTPS connectivity (TLS 1.2+)
- Access to SQL Server instance
- Windows AD domain membership

### Permissions Required

- Local Administrator access on target server
- SQL Server DBA permissions (to create databases/logins)
- IIS Manager access (Administrator)
- Domain Admin or ability to configure AD groups for RBAC

### Pre-Deployment Access List

| Resource | Access Type | Purpose |
|----------|------------|---------|
| movex-rest-api | API endpoint | M3 transaction building |
| SQL Server | Database creation | Audit log storage |
| Windows AD | LDAP queries | User authentication |
| Certificate store | Read | SSL/TLS for HTTPS |
| UNC share | Read/Write | Deployment source (if used) |

---

## Pre-Deployment Checklist

### Code & Build

- [ ] Latest code pulled from `master` branch
- [ ] Version number updated in `.csproj` file
- [ ] All unit tests pass locally (`dotnet test`)
- [ ] No hardcoded credentials in source code
- [ ] Build artifacts documented (version, commit hash)

### Environment Setup

- [ ] Target server identified (hostname, IP)
- [ ] IIS 10.0+ installed and running
- [ ] .NET 8.0 Hosting Bundle installed
  - Verify with: `dotnet --version` and check IIS module
- [ ] SQL Server instance accessible from IIS server
  - Test connection: `sqlcmd -S <server> -E`
- [ ] Windows AD domain accessible
  - Test with: `nltest /sc_query:<domain>`

### Security

- [ ] SSL/TLS certificate acquired (wildcard or specific hostname)
  - CN matches deployment hostname
  - Not expired
  - Trusted by all clients
- [ ] Appsettings encryption key generated (if using CONFIG_KEY env var)
- [ ] Database credentials stored in User Secrets or Azure Key Vault
- [ ] RBAC groups created in AD

### Networking

- [ ] DNS entry created for IIS hostname
- [ ] Firewall rules allow:
  - Inbound HTTPS (port 443)
  - Inbound HTTP (port 80, for redirects)
  - Outbound to movex-rest-api (port configured)
  - Outbound to SQL Server (typically 1433)
- [ ] No proxy/WAF interfering with authentication

### Documentation

- [ ] Endpoint registry configuration reviewed
- [ ] RBAC configuration reviewed
- [ ] Audit logging format understood
- [ ] Rollback plan documented
- [ ] Post-deployment test plan documented

---

## Environment Setup

### 1. Install .NET 8.0 Hosting Bundle

```powershell
# Download from Microsoft
# https://dotnet.microsoft.com/en-us/download/dotnet/8.0

# Run installer as Administrator
# File: dotnet-hosting-8.0.x-win.exe

# Verify installation
dotnet --version   # Should show 8.0.x or higher

# Restart IIS
iisreset /restart
```

### 2. Create SQL Server Database & Audit Log Table

```sql
-- Create database
CREATE DATABASE [SM_Portal_Audit]
ON
(
  NAME = N'SM_Portal_Audit_data',
  FILENAME = N'C:\SQLData\SM_Portal_Audit_data.mdf',
  SIZE = 100MB,
  MAXSIZE = 1GB,
  FILEGROWTH = 50MB
),
(
  NAME = N'SM_Portal_Audit_log',
  FILENAME = N'C:\SQLData\SM_Portal_Audit_log.ldf',
  SIZE = 50MB,
  MAXSIZE = 500MB,
  FILEGROWTH = 25MB
)
LOG ON
(
  NAME = N'SM_Portal_Audit_log',
  FILENAME = N'C:\SQLLogs\SM_Portal_Audit_log.ldf'
);
GO

-- Enable TDE (Transparent Data Encryption)
USE master;
GO
CREATE MASTER KEY ENCRYPTION BY PASSWORD = 'ComplexPassword123!@#';
GO
CREATE CERTIFICATE SMPortalCert WITH SUBJECT = 'SM-Portal TDE Certificate';
GO

USE SM_Portal_Audit;
GO
CREATE DATABASE ENCRYPTION KEY
  WITH ALGORITHM = AES_256
  ENCRYPTION BY SERVER CERTIFICATE SMPortalCert;
GO
ALTER DATABASE SM_Portal_Audit SET ENCRYPTION ON;
GO

-- Create audit log table
USE SM_Portal_Audit;
GO
CREATE TABLE [dbo].[SRX_AuditLog]
(
  [AuditId] BIGINT IDENTITY(1,1) PRIMARY KEY,
  [Timestamp] DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
  [UserId] NVARCHAR(256) NOT NULL,
  [UserName] NVARCHAR(256) NOT NULL,
  [Department] NVARCHAR(256) NULL,
  [Action] NVARCHAR(256) NOT NULL,
  [EndpointId] NVARCHAR(256) NOT NULL,
  [EndpointMethod] NVARCHAR(256) NOT NULL,
  [RequestData] NVARCHAR(MAX) NULL,
  [ResponseStatus] INT NOT NULL,
  [ErrorMessage] NVARCHAR(MAX) NULL,
  [ClientIp] NVARCHAR(45) NOT NULL,
  [SourceSystem] NVARCHAR(256) NULL,
  [CorrelationId] NVARCHAR(256) NULL,
  CONSTRAINT [CK_AuditLog_Action] CHECK ([Action] IN ('READ', 'CREATE', 'UPDATE', 'DELETE', 'EXECUTE')),
  CONSTRAINT [CK_AuditLog_ResponseStatus] CHECK ([ResponseStatus] >= 100 AND [ResponseStatus] < 600)
);
GO

-- Create indexes for query performance
CREATE NONCLUSTERED INDEX [IDX_AuditLog_Timestamp] 
  ON [dbo].[SRX_AuditLog] ([Timestamp] DESC)
  INCLUDE ([UserId], [Action], [EndpointId]);
GO

CREATE NONCLUSTERED INDEX [IDX_AuditLog_UserId]
  ON [dbo].[SRX_AuditLog] ([UserId])
  INCLUDE ([Timestamp], [Action], [EndpointId]);
GO

CREATE NONCLUSTERED INDEX [IDX_AuditLog_EndpointId]
  ON [dbo].[SRX_AuditLog] ([EndpointId])
  INCLUDE ([Timestamp], [UserId], [Action]);
GO

-- Enable compression for old data (optional, saves space)
ALTER TABLE [dbo].[SRX_AuditLog] REBUILD PARTITION = ALL
  WITH (DATA_COMPRESSION = PAGE);
GO

-- Create login for IIS app pool
USE master;
GO
CREATE LOGIN [IIS_SMPortal] WITH PASSWORD = 'ComplexAppPoolPassword123!@#';
GO
ALTER LOGIN [IIS_SMPortal] WITH DEFAULT_DATABASE = [SM_Portal_Audit];
GO

-- Create user and grant minimal permissions
USE SM_Portal_Audit;
GO
CREATE USER [IIS_SMPortal] FOR LOGIN [IIS_SMPortal];
GO
GRANT INSERT, SELECT ON SCHEMA::[dbo] TO [IIS_SMPortal];
GO
-- Only the audit table should be accessible
GRANT INSERT ON [dbo].[SRX_AuditLog] TO [IIS_SMPortal];
GRANT SELECT ON [dbo].[SRX_AuditLog] TO [IIS_SMPortal];
GO
```

### 3. Create Windows AD Groups for RBAC

```powershell
# Run on Domain Controller or using Active Directory Users and Computers

# Create role-based groups
New-ADGroup -Name "SM_Portal_Admins" -GroupScope Global `
  -Description "SM-Portal administrators (full access)"

New-ADGroup -Name "SM_Portal_MMS175_Updaters" -GroupScope Global `
  -Description "Can execute MMS175MI (Item Movement) updates"

New-ADGroup -Name "SM_Portal_MMS200_Readers" -GroupScope Global `
  -Description "Can execute MMS200MI (Item Lookup) queries"

New-ADGroup -Name "SM_Portal_Auditors" -GroupScope Global `
  -Description "Can view audit logs (read-only)"

# Add users to groups
Add-ADGroupMember -Identity "SM_Portal_MMS175_Updaters" `
  -Members @("user1@domain", "user2@domain")

# Verify group creation
Get-ADGroup -Filter {Name -like "SM_Portal_*"} | Select-Object Name, Description
```

### 4. Configure App Pool Identity

```powershell
# Run as Administrator in PowerShell

# Import IIS module
Import-Module WebAdministration

# Create app pool
New-WebAppPool -Name "SMPortalPool" -Force

# Configure pool identity to use AD service account
$appPool = Get-Item "IIS:\AppPools\SMPortalPool"
$appPool.ProcessModel.IdentityType = "SpecificUser"
$appPool.ProcessModel.UserName = "domain\svc_SMPortal"
$appPool.ProcessModel.Password = "ServiceAccountPassword123!@#"
$appPool.Save()

# Configure pool recycling (optional)
Set-ItemProperty "IIS:\AppPools\SMPortalPool" -Name "ProcessModel.MaxProcesses" -Value 1
Set-ItemProperty "IIS:\AppPools\SMPortalPool" -Name "ProcessModel.IdleTimeout" -Value ([TimeSpan]"00:30:00")

# Restart pool
Restart-WebAppPool -Name "SMPortalPool"
```

---

## Build Preparation

### 1. Clone or Update Repository

```powershell
# Clone repository (first time)
git clone git@github.com:company/SM-Portal.git C:\Deploy\SM-Portal

# Or update existing clone
cd C:\Deploy\SM-Portal
git pull origin master
git checkout <tag-or-commit-hash>  # Use specific version if available
```

### 2. Configure Appsettings

```powershell
# Copy template to deployment location
cp C:\Deploy\SM-Portal\src\appsettings.json `
   C:\Deploy\SM-Portal\src\appsettings.Production.json

# Edit production settings
notepad C:\Deploy\SM-Portal\src\appsettings.Production.json
```

**Example appsettings.Production.json:**

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft": "Warning",
      "Microsoft.EntityFrameworkCore": "Warning"
    }
  },
  "ConnectionStrings": {
    "AuditLog": "Server=SQL-SERVER;Database=SM_Portal_Audit;User ID=IIS_SMPortal;Password=***;Encrypt=true;TrustServerCertificate=false;Connection Timeout=30;"
  },
  "Movex": {
    "ApiBaseUrl": "http://movex-rest-api:5000",  // Or internal IP
    "TransactionTimeout": 30000,
    "RetryPolicy": {
      "MaxRetries": 3,
      "DelayMs": 1000
    }
  },
  "Rbac": {
    "DomainName": "company.local",
    "EnableGroupMapping": true,
    "DefaultRole": "Viewer",
    "CacheDurationMinutes": 60
  },
  "Audit": {
    "LogAllRequests": true,
    "LogRequestBody": false,
    "LogResponseBody": false,
    "RetentionDays": 2555,  // 7 years
    "BatchSize": 100,
    "BatchIntervalMs": 5000
  },
  "Cors": {
    "AllowedOrigins": [
      "https://sm-portal.company.local",
      "https://sm-portal-internal.company.local"
    ]
  },
  "Kestrel": {
    "Endpoints": {
      "Http": {
        "Url": "http://localhost:5000"
      }
    }
  }
}
```

### 3. Configure Connection String (Secure Method)

**Option A: User Secrets (Development)**

```powershell
cd C:\Deploy\SM-Portal\src

# Initialize User Secrets
dotnet user-secrets init

# Set connection string
dotnet user-secrets set "ConnectionStrings:AuditLog" `
  "Server=SQL-SERVER;Database=SM_Portal_Audit;User ID=IIS_SMPortal;Password=YourPassword;Encrypt=true;"
```

**Option B: Environment Variables (Production)**

```powershell
# Set as system environment variable
[Environment]::SetEnvironmentVariable(
  "ConnectionStrings__AuditLog",
  "Server=SQL-SERVER;Database=SM_Portal_Audit;User ID=IIS_SMPortal;Password=YourPassword;Encrypt=true;",
  "Machine"
)

# Verify
$env:ConnectionStrings__AuditLog
```

### 4. Build Application

```powershell
cd C:\Deploy\SM-Portal\src

# Restore dependencies
dotnet restore

# Run tests
dotnet test ../tests --configuration Release --logger "console;verbosity=minimal"

# Build release package
dotnet publish -c Release -o C:\Deploy\SM-Portal-Release

# Verify build output
ls C:\Deploy\SM-Portal-Release
# Should contain: SM-Portal.deps.json, SM-Portal.dll, appsettings.json, etc.
```

### 5. Validate Build Artifacts

```powershell
# Check for required files
$requiredFiles = @(
  "SM-Portal.dll",
  "SM-Portal.runtimeconfig.json",
  "appsettings.json"
)

$outPath = "C:\Deploy\SM-Portal-Release"
foreach ($file in $requiredFiles) {
  if (Test-Path "$outPath\$file") {
    Write-Host "✓ $file found"
  } else {
    Write-Host "✗ $file MISSING" -ForegroundColor Red
  }
}
```

---

## IIS Configuration

### 1. Create Website in IIS

```powershell
# Import WebAdministration module
Import-Module WebAdministration

# Create website
New-Website -Name "SM-Portal" `
  -PhysicalPath "C:\InetPub\SM-Portal" `
  -Port 443 `
  -HostHeader "sm-portal.company.local" `
  -ApplicationPool "SMPortalPool" `
  -Ssl

# Binding configuration
New-WebBinding -Name "SM-Portal" `
  -IP "0.0.0.0" `
  -Port 443 `
  -Protocol "https" `
  -HostHeader "sm-portal.company.local" `
  -SslFlags 0

# HTTP redirect to HTTPS (optional but recommended)
New-Website -Name "SM-Portal-HTTP" `
  -PhysicalPath "C:\InetPub\SM-Portal-HTTP" `
  -Port 80 `
  -HostHeader "sm-portal.company.local" `
  -ApplicationPool "DefaultAppPool"
```

### 2. Configure SSL/TLS Certificate

```powershell
# Import certificate to Local Machine\Personal store
$cert = Import-PfxCertificate `
  -FilePath "C:\Certs\sm-portal.company.local.pfx" `
  -CertStoreLocation "Cert:\LocalMachine\My" `
  -Password (ConvertTo-SecureString "CertPassword" -AsPlainText -Force)

# Get certificate thumbprint
$thumbprint = $cert.Thumbprint

# Bind certificate to website
$binding = Get-WebBinding -Name "SM-Portal" -Port 443 -Protocol "https"
$binding.AddSslCertificate($thumbprint, "My")
```

### 3. Configure Application Settings

```powershell
# Set .NET Framework version (ASP.NET Core in-process)
Set-ItemProperty "IIS:\AppPools\SMPortalPool" `
  -Name "ManagedRuntimeVersion" -Value ""

# Set module type
Set-ItemProperty "IIS:\Sites\SM-Portal" `
  -Name "applicationPool" -Value "SMPortalPool"

# Enable app pool preload (optional)
Set-ItemProperty "IIS:\AppPools\SMPortalPool" `
  -Name "autoStart" -Value $true
```

### 4. Configure URL Rewrite (for redirects)

```powershell
# Add HTTP to HTTPS redirect
$rewriteRule = @{
    name          = "Redirect HTTP to HTTPS"
    patternSyntax = "Wildcard"
    pattern       = "*"
    ignoreCase    = $true
    action        = @{
        type  = "Redirect"
        url   = "https://{HTTP_HOST}{REQUEST_URI}"
        code  = 307  # Temporary redirect
    }
    stopProcessing = $true
}

# Apply rule to HTTP site (if created above)
# This is typically done via web.config file
```

### 5. Set File Permissions

```powershell
# Grant IIS app pool read permissions
$appPath = "C:\InetPub\SM-Portal"
$acl = Get-Acl $appPath

# Add app pool identity
$appPoolIdentity = New-Object System.Security.Principal.NTAccount("IIS AppPool", "SMPortalPool")
$accessRule = New-Object System.Security.AccessControl.FileSystemAccessRule(
  $appPoolIdentity,
  "Read, Execute, ListDirectory",
  "ContainerInherit, ObjectInherit",
  "None",
  "Allow"
)
$acl.AddAccessRule($accessRule)
Set-Acl -Path $appPath -AclObject $acl

# Verify
Get-Acl $appPath | Format-List
```

---

## Application Deployment

### 1. Prepare Deployment Directory

```powershell
# Create/backup existing deployment
$deployPath = "C:\InetPub\SM-Portal"
if (Test-Path $deployPath) {
  $backupPath = "$deployPath.backup.$(Get-Date -Format 'yyyyMMdd-HHmmss')"
  Rename-Item -Path $deployPath -NewName $backupPath
  Write-Host "Backed up existing deployment to: $backupPath"
}

# Create fresh deployment directory
New-Item -Path $deployPath -ItemType Directory -Force | Out-Null
```

### 2. Copy Application Files

```powershell
# Copy release build to IIS directory
Copy-Item -Path "C:\Deploy\SM-Portal-Release\*" `
          -Destination $deployPath `
          -Recurse -Force

# Copy configuration files
Copy-Item -Path "C:\Deploy\SM-Portal\src\appsettings.Production.json" `
          -Destination "$deployPath\appsettings.Production.json" `
          -Force

# Copy endpoint registry and RBAC config
Copy-Item -Path "C:\Deploy\SM-Portal\config\*" `
          -Destination "$deployPath\config\" `
          -Recurse -Force

Write-Host "Application files deployed to: $deployPath"
```

### 3. Configure Web.config (if needed)

**Note:** ASP.NET Core uses appsettings.json, but you may need web.config for IIS configuration.

Create or update `C:\InetPub\SM-Portal\web.config`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <!-- ASP.NET Core Handler -->
    <handlers>
      <add name="aspNetCore" 
           path="*" 
           verb="*" 
           modules="AspNetCoreModuleV2" 
           resourceType="Unspecified" />
    </handlers>
    <aspNetCore processPath="dotnet" 
                arguments=".\SM-Portal.dll" 
                stdoutLogEnabled="false" 
                stdoutLogFile=".\logs\stdout"
                hostingModel="inprocess" />

    <!-- Security Headers -->
    <httpProtocol>
      <customHeaders>
        <add name="Strict-Transport-Security" value="max-age=31536000; includeSubDomains" />
        <add name="X-Content-Type-Options" value="nosniff" />
        <add name="X-Frame-Options" value="DENY" />
        <add name="X-XSS-Protection" value="1; mode=block" />
        <add name="Content-Security-Policy" value="default-src 'self'; script-src 'self'" />
      </customHeaders>
    </httpProtocol>

    <!-- Compression -->
    <urlCompression doStaticCompression="true" 
                    doDynamicCompression="true" />

    <!-- Request Filtering -->
    <security>
      <requestFiltering>
        <fileExtensions>
          <add fileExtension=".config" allowed="false" />
          <add fileExtension=".json" allowed="true" />
        </fileExtensions>
      </requestFiltering>
    </security>

    <!-- Authentication (Windows AD) -->
    <authentication>
      <windowsAuthentication enabled="true" />
      <anonymousAuthentication enabled="false" />
    </authentication>
  </system.webServer>
</configuration>
```

### 4. Restart IIS and Verify Deployment

```powershell
# Restart app pool
Restart-WebAppPool -Name "SMPortalPool"

# Wait for restart
Start-Sleep -Seconds 5

# Check app pool state
Get-WebAppPoolState -Name "SMPortalPool"
# Should return "Started"

# Test website is running
$testUrl = "https://sm-portal.company.local/health"
try {
  $response = Invoke-WebRequest -Uri $testUrl -UseBasicParsing -SkipCertificateCheck
  Write-Host "✓ Website responds: $($response.StatusCode)"
} catch {
  Write-Host "✗ Website error: $_" -ForegroundColor Red
}
```

---

## Post-Deployment Verification

### 1. Health Check Endpoint

```powershell
# Test health endpoint
$healthUrl = "https://sm-portal.company.local/api/health"

try {
  $response = Invoke-WebRequest -Uri $healthUrl `
    -UseBasicParsing `
    -SkipCertificateCheck `
    -ErrorAction Stop
  
  if ($response.StatusCode -eq 200) {
    Write-Host "✓ Health check passed" -ForegroundColor Green
    Write-Host "Response: $($response.Content)"
  }
} catch {
  Write-Host "✗ Health check failed: $_" -ForegroundColor Red
}
```

### 2. Authentication Test (Windows AD)

```powershell
# Test with current user credentials
$testUrl = "https://sm-portal.company.local/api/auth/user"

try {
  $response = Invoke-WebRequest -Uri $testUrl `
    -UseBasicParsing `
    -UseDefaultCredentials `
    -SkipCertificateCheck

  Write-Host "✓ Authentication successful" -ForegroundColor Green
  Write-Host "User info: $($response.Content)"
} catch {
  Write-Host "✗ Authentication failed: $_" -ForegroundColor Red
}
```

### 3. Endpoint Registry Verification

```powershell
$testUrl = "https://sm-portal.company.local/api/endpoints"

try {
  $response = Invoke-WebRequest -Uri $testUrl `
    -UseBasicParsing `
    -UseDefaultCredentials `
    -SkipCertificateCheck | ConvertFrom-Json

  Write-Host "✓ Endpoint registry loaded" -ForegroundColor Green
  Write-Host "Endpoints available: $($response.Count)"
  $response | ForEach-Object { Write-Host "  - $($_.displayName)" }
} catch {
  Write-Host "✗ Endpoint registry error: $_" -ForegroundColor Red
}
```

### 4. Database Connectivity Test

```sql
-- Verify audit log table is accessible
USE SM_Portal_Audit;
GO

-- Test INSERT permission
INSERT INTO [dbo].[SRX_AuditLog] 
  ([UserId], [UserName], [Action], [EndpointId], [EndpointMethod], [ClientIp], [ResponseStatus])
VALUES 
  ('TEST-USER', 'Test User', 'TEST', 'test-endpoint', 'READ', '127.0.0.1', 200);

-- Verify data was written
SELECT TOP 5 * FROM [dbo].[SRX_AuditLog] ORDER BY [AuditId] DESC;

-- Clean up test record
DELETE FROM [dbo].[SRX_AuditLog] WHERE [Action] = 'TEST';

GO
```

### 5. Certificate Validation

```powershell
# Verify SSL certificate
$hostname = "sm-portal.company.local"
$cert = Get-WebBinding -Name "SM-Portal" -Protocol "https" | 
  Select-Object -ExpandProperty "sslFlags"

Write-Host "SSL Certificate Details:"
Get-ChildItem -Path "Cert:\LocalMachine\My" | 
  Where-Object { $_.Subject -like "*$hostname*" } |
  Format-List Subject, Thumbprint, NotBefore, NotAfter, Issuer
```

### 6. IIS Logs Review

```powershell
# Check for errors in IIS logs
$logPath = "C:\inetpub\logs\LogFiles\W3SVC\<site-number>"
Get-ChildItem $logPath -Filter "*.log" |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1 |
  Tail -Lines 50

# Search for errors
Get-Content "$logPath\*.log" |
  Select-String "500|401|403" |
  Select-Object -Last 20
```

### 7. Event Viewer Errors

```powershell
# Check Application event log
Get-EventLog -LogName "Application" -EntryType "Error" -Newest 20 |
  Where-Object { $_.Source -like "*SM*" -or $_.Source -like "*ASP*" } |
  Format-List TimeGenerated, Source, Message
```

### 8. Performance Monitoring

```powershell
# Monitor app pool CPU and memory
Get-Process -Name "w3wp" | 
  Select-Object Name, Id, CPU, PM, VM

# Get app pool handle count
Get-Process -Name "w3wp" | 
  Select-Object Name, Id, Handles, PagedMemorySize
```

---

## Troubleshooting

### Issue: 500 Internal Server Error

**Diagnosis:**

```powershell
# 1. Check IIS logs
Get-Content "C:\inetpub\logs\LogFiles\W3SVC\*\*.log" | 
  Select-String "500" | 
  Select-Object -Last 10

# 2. Check application event log
Get-EventLog -LogName "Application" -EntryType "Error" -Newest 20

# 3. Check app pool status
Get-WebAppPoolState -Name "SMPortalPool"

# 4. Verify dotnet installation
dotnet --version
```

**Solutions:**

- Verify appsettings.json syntax (use JSON validator)
- Ensure connection string is correct
- Check file permissions on deployment directory
- Verify .NET 8.0 Hosting Bundle is installed
- Restart app pool and IIS

### Issue: 401 Unauthorized (Authentication Failed)

**Diagnosis:**

```powershell
# 1. Verify Windows Authentication is enabled
Get-WebConfiguration -Filter "/system.webServer/security/authentication/windowsAuthentication" `
  -PSPath "IIS:\Sites\SM-Portal"

# 2. Test AD connectivity
$domain = [System.DirectoryServices.ActiveDirectory.Domain]::GetCurrentDomain()
Write-Host "Connected to domain: $($domain.Name)"

# 3. Verify AD group membership
$user = [System.Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object System.Security.Principal.WindowsPrincipal($user)
$roles = [System.Security.Principal.WindowsBuiltInRole]::Administrator
Write-Host "User: $($user.Name)"
Write-Host "Is Admin: $($principal.IsInRole($roles))"
```

**Solutions:**

- Enable Windows Authentication in web.config
- Disable Anonymous Authentication
- Ensure appsettings.json has correct domain name
- Verify AD groups exist and user is member
- Check Kerberos configuration (if using domain)

### Issue: Cannot Connect to SQL Server

**Diagnosis:**

```powershell
# 1. Test SQL Server connectivity
$connectionString = "Server=SQL-SERVER;Database=SM_Portal_Audit;Integrated Security=true;"
try {
  $connection = New-Object System.Data.SqlClient.SqlConnection($connectionString)
  $connection.Open()
  Write-Host "✓ SQL connection successful"
  $connection.Close()
} catch {
  Write-Host "✗ SQL connection failed: $_"
}

# 2. Verify SQL credentials
sqlcmd -S SQL-SERVER -U IIS_SMPortal -P "YourPassword" -d SM_Portal_Audit -Q "SELECT @@VERSION"

# 3. Check firewall
Test-NetConnection -ComputerName "SQL-SERVER" -Port 1433
```

**Solutions:**

- Verify SQL Server is running: `Test-NetConnection -ComputerName SQL-SERVER -Port 1433`
- Check connection string in appsettings.json
- Ensure SQL login exists: `sqlcmd -U sa -P [password] -Q "SELECT * FROM sys.sysusers"`
- Verify firewall allows port 1433
- Check SQL Server error log: `C:\Program Files\Microsoft SQL Server\MSSQL##.INSTANCE\MSSQL\LOG\ERRORLOG`

### Issue: Certificate Validation Errors

**Diagnosis:**

```powershell
# 1. Check certificate validity
$cert = Get-Item Cert:\LocalMachine\My\<THUMBPRINT> -ErrorAction SilentlyContinue
if ($cert) {
  Write-Host "Certificate found"
  Write-Host "Subject: $($cert.Subject)"
  Write-Host "Issuer: $($cert.Issuer)"
  Write-Host "NotBefore: $($cert.NotBefore)"
  Write-Host "NotAfter: $($cert.NotAfter)"
} else {
  Write-Host "Certificate not found in local store"
}

# 2. Test HTTPS binding
$binding = Get-WebBinding -Name "SM-Portal" -Protocol "https"
Write-Host "HTTPS Binding: $($binding.bindingInformation)"

# 3. Verify certificate chain
certutil -v -d $cert.Thumbprint
```

**Solutions:**

- Renew expired certificate before deployment
- Ensure certificate CN matches hostname (sm-portal.company.local)
- Import certificate to trusted store for clients
- Verify certificate is in Personal store (Cert:\LocalMachine\My)
- Re-bind certificate if binding shows wrong thumbprint

### Issue: App Pool Crashes on Startup

**Diagnosis:**

```powershell
# 1. Check app pool state
Get-WebAppPoolState -Name "SMPortalPool"

# 2. View crash dump (if available)
Get-ChildItem "C:\Windows\System32\config\systemprofile\AppData\Local\CrashDumps"

# 3. Check for managed code exceptions
Get-EventLog -LogName "Application" -Source ".NET Runtime" -Newest 20

# 4. Enable detailed failure page
Set-WebConfigurationProperty -PSPath "IIS:\Sites\SM-Portal" `
  -Filter "system.webServer/httpErrors" `
  -Name "errorMode" -Value "Detailed"
```

**Solutions:**

- Check appsettings.json for syntax errors
- Verify all required files are present in deployment
- Ensure .NET 8.0 Hosting Bundle is installed
- Review event log for specific error
- Enable stdout logging in web.config: `stdoutLogEnabled="true"`

### Enable Diagnostic Logging

```xml
<!-- Add to web.config for troubleshooting -->
<aspNetCore 
    processPath="dotnet" 
    arguments=".\SM-Portal.dll" 
    stdoutLogEnabled="true" 
    stdoutLogFile=".\logs\stdout"
    hostingModel="inprocess" >
  <environmentVariables>
    <environmentVariable name="ASPNETCORE_ENVIRONMENT" value="Production" />
    <environmentVariable name="ASPNETCORE_URLS" value="http://localhost:5000" />
  </environmentVariables>
</aspNetCore>
```

Then check `C:\InetPub\SM-Portal\logs\stdout_*.log`

---

## Rollback Procedures

### Quick Rollback (Last 5 Minutes)

```powershell
# 1. Stop app pool
Stop-WebAppPool -Name "SMPortalPool"

# 2. Restore from backup
$deployPath = "C:\InetPub\SM-Portal"
$backupPath = Get-ChildItem -Path "$deployPath.backup.*" | 
              Sort-Object Name -Descending | 
              Select-Object -First 1

if ($backupPath) {
  Remove-Item -Path $deployPath -Recurse -Force
  Rename-Item -Path $backupPath.FullName -NewName $deployPath
  Write-Host "✓ Restored from $($backupPath.Name)"
} else {
  Write-Host "✗ No backup found!"
}

# 3. Start app pool
Start-WebAppPool -Name "SMPortalPool"

# 4. Verify
Start-Sleep -Seconds 5
Get-WebAppPoolState -Name "SMPortalPool"
```

### Rollback to Previous Version (Database Reset)

```powershell
# 1. Stop IIS
iisreset /stop

# 2. Restore database from backup
$backupFile = "C:\SQLBackups\SM_Portal_Audit.bak"

sqlcmd -S SQL-SERVER -E -Q @"
  USE master;
  ALTER DATABASE SM_Portal_Audit SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
  RESTORE DATABASE SM_Portal_Audit 
    FROM DISK = '$backupFile'
    WITH REPLACE, RECOVERY;
  ALTER DATABASE SM_Portal_Audit SET MULTI_USER;
"@

# 3. Restore application files
Copy-Item -Path "C:\Deploy\SM-Portal-Previous\*" `
          -Destination "C:\InetPub\SM-Portal" `
          -Recurse -Force

# 4. Start IIS
iisreset /start

# 5. Verify
Start-Sleep -Seconds 10
Invoke-WebRequest -Uri "https://sm-portal.company.local/api/health" `
  -SkipCertificateCheck -UseBasicParsing
```

### Complete Rollback (Full Environment Revert)

```powershell
# 1. Revert IIS configuration
Restore-WebConfiguration -Backups (Get-ChildItem "C:\Windows\System32\inetsrv\ConfigBackup" | Select -Last 1)

# 2. Restore database from full backup
# See "Rollback to Previous Version" section above

# 3. Restore application files from backup location
Copy-Item -Path "C:\Deploy\SM-Portal-Full-Backup-<date>\*" `
          -Destination "C:\InetPub\SM-Portal" `
          -Recurse -Force

# 4. Restart IIS
iisreset /restart

# 5. Communicate with stakeholders
Write-Host "Rollback complete. Please verify application functionality."
Write-Host "Date: $(Get-Date)"
Write-Host "Rolled back to: <previous version>"
```

### Post-Rollback Checklist

- [ ] Verify application is accessible
- [ ] Check audit logs show no new errors
- [ ] Confirm all endpoints respond
- [ ] Verify database integrity
- [ ] Test RBAC with sample user
- [ ] Check IIS logs for errors
- [ ] Review event viewer for warnings
- [ ] Notify stakeholders of rollback
- [ ] Document root cause
- [ ] Schedule post-mortem

---

## Pre-Deployment Handoff Checklist

Before handing off to production, ensure:

- [ ] Deployment tested in staging environment
- [ ] All post-deployment tests pass
- [ ] Database backups created
- [ ] Rollback plan tested
- [ ] Change ticket created and approved
- [ ] Stakeholders notified
- [ ] On-call team briefed
- [ ] Monitoring alerts configured
- [ ] Runbook updated with specifics
- [ ] Performance baseline established

---

## Support & Escalation

**Issues to escalate:**
- Persistent 500 errors after troubleshooting
- Database connectivity problems
- SSL certificate issues
- Performance degradation (>2 sec response times)
- Any security-related errors

**Contact:**
- On-call DevOps: `devops-oncall@company.local`
- Database Admin: `dba@company.local`
- Security Team: `security@company.local`

---

**Developed**: Feb 25, 2026  
**Version**: 1.0  
**Next Review**: Q2 2026

