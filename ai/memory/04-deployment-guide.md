# MOVEX-Portal - Deployment Guide

**Last Updated**: 2026-03-02
**Status**: Active — v0.2.x deployed to SRXWEBAPP1
**Version**: 0.2.x

## 🎯 Deployment Overview

This document outlines the deployment architecture, server configuration, and operational procedures for MOVEX-Portal.

**Target Environment**: On-premises Windows Server infrastructure  
**Deployment Model**: Single-server IIS hosting (Phase 1), scalable to multi-server (Phase 2+)

---

## 🏗️ Infrastructure Architecture

### Network Topology

```
┌─────────────────────────────────────────────────────────────────┐
│                         DMZ (VLAN 5)                            │
│                                                                 │
│                    ┌──────────────────┐                        │
│                    │   Firewall       │                        │
│                    │   (Fortigate)    │                        │
│                    └────────┬─────────┘                        │
│                             │                                   │
└─────────────────────────────┼───────────────────────────────────┘
                              │
┌─────────────────────────────┼───────────────────────────────────┐
│                   INTERNAL NETWORK (VLAN 10)                    │
│                             │                                   │
│   ┌──────────────┐         │         ┌──────────────┐         │
│   │  Client PCs  │─────────┼─────────│  L3 Switch   │         │
│   │  (Windows 10)│    HTTPS│         │  (Core)      │         │
│   └──────────────┘         │         └──────┬───────┘         │
│                             │                │                  │
│                     ┌───────▼───────┐       │                  │
│                     │  SRXWEBAPP1   │◄──────┤                  │
│                     │  (IIS Host)   │       │                  │
│                     │  - Portal     │       │                  │
│                     │  - Movex API  │       │                  │
│                     └───────┬───────┘       │                  │
│                             │               │                  │
│                             │ HTTP          │ SQL              │
│                             │               │                  │
│                     ┌───────▼───────┐  ┌────▼─────┐          │
│                     │  SRXMOVEX01   │  │ SRXDB01  │          │
│                     │  (M3 Server)  │  │ (SQL)    │          │
│                     │  Port 6300    │  │          │          │
│                     └───────────────┘  └──────────┘          │
│                                                                 │
│                     ┌──────────────┐                           │
│                     │   SRXDC01    │                           │
│                     │   (AD DC)    │                           │
│                     │              │                           │
│                     └──────────────┘                           │
└─────────────────────────────────────────────────────────────────┘
```

### IP Address Allocation

| Server | IP Address | FQDN | Role |
|--------|-----------|------|------|
| **SRXWEBAPP1** | 192.168.1.50 | srxwebapp1.srxglobal.com | IIS Web Server |
| **SRXDB01** | 192.168.1.51 | srxdb01.srxglobal.com | SQL Server |
| **SRXMOVEX01** | 150.3.2.100 | srxmovex01.srxglobal.com | M3 MOVEX |
| **SRXDC01** | 192.168.1.10 | srxdc01.srxglobal.com | Domain Controller |

---

## 🖥️ Server Specifications

### SRXWEBAPP1 (Web Server)

**Hardware:**
- **CPU**: 4 vCPUs (Intel Xeon or equivalent)
- **RAM**: 16 GB
- **Storage**: 100 GB SSD (C:\), 200 GB HDD (D:\ - logs)
- **Network**: 1 Gbps NIC

**Operating System:**
- **OS**: Windows Server 2019 Standard (1809)
- **Edition**: 64-bit
- **Language**: English (US)

**Software Components:**
- IIS 10.0
- .NET 8.0 Runtime (ASP.NET Core)
- .NET 8.0 Hosting Bundle
- SQL Server Management Studio (SSMS) 19.x
- Git for Windows 2.43+
- Visual Studio 2022 Remote Debugger (dev only)

**Disk Layout:**
```
C:\                           # System & Applications
├── inetpub\
│   └── wwwroot\
│       └── SMPortal\
│           ├── frontend\dist\  # React SPA static files (npm run build output)
│           └── backend\        # .NET API (dotnet publish output)
├── Logs\
│   └── SMPortal\               # IIS access logs
└── Windows\

D:\                           # Data & Backups
├── AppBackups\
│   └── SMPortal\
└── LogArchive\
```

---

## 🔧 IIS Configuration

### Site Structure

SM-Portal uses **two IIS applications under one website** — the frontend (static SPA) at
the site root and the .NET API as a sub-application at `/api`. Each has its own app pool.

```
IIS Website: SM-Portal  (port 80, hostname: srxwebapp1.srxglobal.com)
Physical root: C:\inetpub\wwwroot\SM-Portal-UI\        ← frontend dist/ contents deployed here
App Pool:      SM-Portal-Frontend
│
└── Sub-application: /api
    Physical root: C:\inetpub\wwwroot\SMPortal\backend\
    App Pool:      SM-Portal-Backend
```

> The frontend and backend physical paths do not need to share a parent folder.
> IIS maps URLs to physical paths independently — the `/api` sub-application
> relationship is defined in IIS, not by folder nesting on disk.

**Why two pools?**
- Process isolation: backend crash/recycle does not drop static file serving
- Independent recycling: deploy backend without interrupting frontend
- Separate Windows identities if needed (backend needs AD/SQL access, frontend does not)
- Separate performance counters and health monitoring

---

### App Pool: SM-Portal-Frontend

Serves only static files — no managed runtime is loaded.

```ini
[General]
.NET CLR Version             = No Managed Code
Managed Pipeline Mode        = Integrated
Start Mode                   = AlwaysRunning
Enable 32-Bit Applications   = False

[Process Model]
Identity                     = ApplicationPoolIdentity
Load User Profile            = False        ← not needed for static files
Idle Time-out (minutes)      = 20
Maximum Worker Processes     = 1

[Recycling]
Regular Time Interval (minutes) = 1740      ← 29 hours, avoids daily patterns
```

---

### App Pool: SM-Portal-Backend

Runs the ASP.NET Core in-process host. CLR version is "No Managed Code" because
AspNetCoreModuleV2 loads the .NET runtime itself — setting a CLR version causes
IIS to attempt loading two runtimes simultaneously.

```ini
[General]
.NET CLR Version             = No Managed Code   ← mandatory for ASP.NET Core in-process
Managed Pipeline Mode        = Integrated
Start Mode                   = AlwaysRunning
Enable 32-Bit Applications   = False

[Process Model]
Identity                     = ApplicationPoolIdentity
Load User Profile            = True              ← REQUIRED for Data Protection key persistence
Idle Time-out (minutes)      = 20                  Without this, keys are ephemeral and all
Maximum Worker Processes     = 1                   protected data (cookies, tokens) breaks
                                                   on every app pool recycle.
[Recycling]
Regular Time Interval (minutes) = 1740

[Rapid-Fail Protection]
Enabled                      = True
Failure Interval (minutes)   = 5
Maximum Failures             = 5
```

---

### Website & Sub-application Authentication

Authentication is configured via `web.config` in each application's physical folder,
not at the app pool level. The `inheritInChildApplications="false"` attribute on both
`web.config` files prevents settings from leaking between the two applications.

| Application | Anonymous Auth | Windows Auth | Managed by |
|-------------|---------------|--------------|------------|
| `/` (frontend static) | **Enabled** | Disabled | `frontend/public/web.config` |
| `/api` (backend) | Disabled | **Enabled** | `src/web.config` |

---

### web.config Files

**Frontend** (`frontend/public/web.config` → deployed to `dist/web.config`):
- Serves static files only (`StaticFileModule`, no AspNetCoreModuleV2)
- URL Rewrite SPA fallback: all non-file/non-`/api` requests → `index.html`
- `inheritInChildApplications="false"` prevents `/api` from inheriting anonymous auth
- Requires **IIS URL Rewrite Module** installed on SRXWEBAPP1

**Backend** (`src/web.config` → deployed to `backend/web.config`):
- `processPath=".\MovexPortal.API.exe"`, `hostingModel="inprocess"`
- `stdoutLogEnabled="false"` — enable temporarily for crash diagnosis only
- `ASPNETCORE_ENVIRONMENT=Production` fallback (prefer setting at app pool level)
- `<remove name="aspNetCore" />` before `<add>` — prevents duplicate handler error
  when the server-level `applicationHost.config` already registers the handler

---

### Auth Scheme Selection (Program.cs)

The backend detects its host at startup using the `APP_POOL_ID` environment variable,
which IIS injects into every w3wp.exe worker process. Kestrel never sets it.

```
APP_POOL_ID present → running on IIS → AddAuthentication("Windows")
APP_POOL_ID absent  → running on Kestrel → AddAuthentication(Negotiate).AddNegotiate()
```

This is environment-name-independent — works correctly even if `ASPNETCORE_ENVIRONMENT`
is misconfigured or not set.

---

### IIS Sub-Application Routing — Controller Route Rules ⚠️ CRITICAL

The SM-Portal backend runs as an IIS **sub-application** at path `/api` under the `SM-Portal`
site. IIS routes all `http://server/api/*` requests to this sub-app and **strips the `/api`
prefix** before ASP.NET Core receives the request.

**What IIS does:**
```
Browser:        GET /api/invoices
IIS sub-app:    strips /api  →  ASP.NET Core receives  GET /invoices
IIS sub-app:    strips /api  →  ASP.NET Core receives  GET /auth/test
```

**Controller routes must NOT include the sub-app prefix:**
```csharp
// CORRECT — route is relative to sub-app root:
[Route("invoices")]
[Route("auth")]
[Route("endpoints")]

// WRONG — repeats sub-app prefix, never matches stripped path:
[Route("api/invoices")]
[Route("api/auth")]
[Route("api/endpoints")]
```

**Why this doesn't break in development:** Kestrel has no sub-application concept.
The browser calls `http://localhost:5050/api/invoices` and Kestrel receives the full path,
so `[Route("api/invoices")]` matches. The mismatch is invisible until IIS deployment.

**Diagnosis when routes return 404 in IIS:**
```powershell
# Confirm sub-app is registered and its path
& "$env:windir\system32\inetsrv\appcmd.exe" list app /site.name:"SM-Portal" /text:*

# Test — if auth handshake completes (NTLM 401→200) but still 404 → route mismatch
curl.exe --negotiate -u : http://localhost/api/auth/test
```

**Tip — use `appcmd.exe` when `WebAdministration` module is unavailable:**
```powershell
# List all apps and their physical paths
& "$env:windir\system32\inetsrv\appcmd.exe" list app

# List app pool config (managedRuntimeVersion, loadUserProfile, etc.)
& "$env:windir\system32\inetsrv\appcmd.exe" list apppool SMPortalPool /text:*
```

---

### IIS Sub-Application Deployment — Required API Keys

The backend calls downstream services using API keys. A missing key is silently absent until
the first request hits that code path — returning 502 Bad Gateway with no other warning.

**Required in `appsettings.Production.json` (or production user-secrets):**
```json
{
  "MyInvoisApi": {
    "BaseUrl": "http://localhost:5051/",
    "ApiKey": "<same value as MyInvois.Api ApiKeys:Primary>"
  }
}
```

Set via user-secrets on the server (preferred over config file):
```powershell
cd C:\inetpub\wwwroot\SM-Portal
dotnet user-secrets set "MyInvoisApi:ApiKey" "<key>"
```

A missing `MyInvoisApi:ApiKey` causes **502 Bad Gateway** on all `/api/invoices` requests.
MyInvois.Api must be running on port 5051 before SM-Portal serves its first invoice request.

---

### Deploy File Layout

The two applications live in separate folders — they do not need to be nested.

```
C:\inetpub\wwwroot\SM-Portal-UI\       ← IIS website physical root (SM-Portal-Frontend pool)
├── index.html                          ← output of: npm run build  (frontend/dist/)
├── assets\
└── web.config                          ← SPA fallback + static file config (frontend/public/web.config)

C:\inetpub\wwwroot\SMPortal\backend\   ← /api sub-application physical root (SM-Portal-Backend pool)
├── MovexPortal.API.exe                 ← output of: dotnet publish -c Release
├── MovexPortal.API.dll
├── web.config                          ← ASP.NET Core IIS config (src/web.config)
├── config\
│   ├── endpoint-registry.json
│   └── rbac-config.json
└── logs\                               ← created at runtime
```

---

## 🗄️ SQL Server Configuration

### Database Setup

**Server**: `SRXDB01`  
**Instance**: Default (MSSQLSERVER)  
**Database**: `MovexPortal_Audit`

#### Create Database
```sql
-- Create database
CREATE DATABASE MovexPortal_Audit
ON PRIMARY 
(
    NAME = N'MovexPortal_Audit',
    FILENAME = N'E:\SQLData\MovexPortal_Audit.mdf',
    SIZE = 100MB,
    FILEGROWTH = 50MB
)
LOG ON 
(
    NAME = N'MovexPortal_Audit_log',
    FILENAME = N'F:\SQLLogs\MovexPortal_Audit_log.ldf',
    SIZE = 50MB,
    FILEGROWTH = 25MB
);
GO

-- Set recovery model
ALTER DATABASE MovexPortal_Audit SET RECOVERY SIMPLE;
GO

-- Enable read committed snapshot (reduce blocking)
ALTER DATABASE MovexPortal_Audit SET READ_COMMITTED_SNAPSHOT ON;
GO
```

#### Create Login & User
```sql
-- Create SQL login for app pool identity
USE [master];
GO

CREATE LOGIN [SRXGLOBAL\SRXWEBAPP1$] FROM WINDOWS;
GO

USE [MovexPortal_Audit];
GO

CREATE USER [SRXGLOBAL\SRXWEBAPP1$] FOR LOGIN [SRXGLOBAL\SRXWEBAPP1$];
GO

-- Grant permissions
ALTER ROLE db_datareader ADD MEMBER [SRXGLOBAL\SRXWEBAPP1$];
ALTER ROLE db_datawriter ADD MEMBER [SRXGLOBAL\SRXWEBAPP1$];
GO

-- Grant execute on stored procedures (if any)
GRANT EXECUTE TO [SRXGLOBAL\SRXWEBAPP1$];
GO
```

#### Audit Table Schema
```sql
USE [MovexPortal_Audit];
GO

-- Audit logs table (append-only)
CREATE TABLE [dbo].[AuditLogs]
(
    [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
    [Timestamp] DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    [Username] NVARCHAR(256) NOT NULL,
    [EndpointId] NVARCHAR(100) NOT NULL,
    [Action] NVARCHAR(50) NOT NULL,
    [InputData] NVARCHAR(MAX) NULL,
    [OutputData] NVARCHAR(MAX) NULL,
    [Status] NVARCHAR(20) NOT NULL,
    [DurationMs] INT NOT NULL,
    [IpAddress] NVARCHAR(45) NULL,
    [IntegrityHash] NVARCHAR(64) NOT NULL,
    [ErrorMessage] NVARCHAR(MAX) NULL,
    CONSTRAINT [CK_AuditLogs_Status] CHECK ([Status] IN ('SUCCESS', 'ERROR', 'DENIED'))
);
GO

-- Indexes for query performance
CREATE NONCLUSTERED INDEX [IX_AuditLogs_User_Timestamp] 
    ON [dbo].[AuditLogs] ([Username] ASC, [Timestamp] DESC);
GO

CREATE NONCLUSTERED INDEX [IX_AuditLogs_Endpoint_Timestamp] 
    ON [dbo].[AuditLogs] ([EndpointId] ASC, [Timestamp] DESC);
GO

CREATE NONCLUSTERED INDEX [IX_AuditLogs_Timestamp] 
    ON [dbo].[AuditLogs] ([Timestamp] DESC);
GO

-- Prevent updates/deletes (append-only)
CREATE TRIGGER [trg_AuditLogs_PreventModification]
ON [dbo].[AuditLogs]
INSTEAD OF UPDATE, DELETE
AS
BEGIN
    RAISERROR('Audit logs are immutable. Updates and deletes are not allowed.', 16, 1);
    ROLLBACK TRANSACTION;
END;
GO
```

#### Maintenance Plan
```sql
-- Retention policy: Keep 7 years (2557 days)
-- Automated job to archive old records (run monthly)
CREATE PROCEDURE [dbo].[sp_ArchiveOldAuditLogs]
AS
BEGIN
    DECLARE @ArchiveDate DATETIME2 = DATEADD(DAY, -2557, SYSUTCDATETIME());
    
    -- Archive to separate table (optional)
    -- For now, just report count
    SELECT 
        COUNT(*) AS RecordsToArchive,
        MIN([Timestamp]) AS OldestRecord
    FROM [dbo].[AuditLogs]
    WHERE [Timestamp] < @ArchiveDate;
END;
GO
```

---

## 🔐 Active Directory Configuration

### Service Account

**Account**: `svc_movexportal@srxglobal.com`  
**Purpose**: Run background tasks (if needed in future)

**Permissions**:
- Member of: `Domain Users`
- NOT member of: Any admin groups
- Password: Complex, 90-day expiry, stored in IT vault

**Usage**: Not used in Phase 1 (ApplicationPoolIdentity sufficient)

### Security Groups

#### User Groups
```
Name: SRX-MOVEX-Portal-Users
Description: Basic access to MOVEX Portal
Members: All staff who need M3 access
```

#### Role Groups
```
Name: SRX-MOVEX-Inventory-Read
Description: Read-only inventory access
Members: Warehouse staff, planners

Name: SRX-MOVEX-Inventory-Write
Description: Modify inventory data
Members: Inventory managers, production supervisors

Name: SRX-MOVEX-Portal-Admins
Description: Full portal administration
Members: IT Manager, System Admin
```

---

## 📦 Deployment Procedure

### Pre-Deployment Checklist

- [ ] .NET 8.0 Hosting Bundle installed on SRXWEBAPP1
- [ ] SQL database created and schema applied
- [ ] IIS Application Pool created
- [ ] SSL certificate installed and bound
- [ ] Windows Firewall rules configured
- [ ] AD security groups created
- [ ] Service account created (if needed)
- [ ] Backup of existing IIS config

### Deployment Steps

#### 1. Build Release Package

**On Development Machine:**
```powershell
# Navigate to project directory
cd C:\Projects\MOVEX-Portal\src

# Restore packages
dotnet restore

# Build release
dotnet build --configuration Release

# Publish
dotnet publish --configuration Release --output C:\Deploy\MOVEX-Portal
```

#### 2. Package Configuration

**Create appsettings.Production.json:**
```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "AllowedHosts": "srxwebapp1.srxglobal.com",
  "ConnectionStrings": {
    "AuditDatabase": "Server=SRXDB01;Database=MovexPortal_Audit;Trusted_Connection=True;TrustServerCertificate=True;"
  },
  "MovexApi": {
    "BaseUrl": "http://srxwebapp1:5000",
    "ApiKey": "{{ENCRYPTED_KEY}}",
    "TimeoutSeconds": 30
  },
  "EndpointRegistry": {
    "ConfigPath": "config/endpoint-registry.json"
  },
  "RbacConfig": {
    "ConfigPath": "config/rbac-config.json"
  },
  "AuditSettings": {
    "MaskSensitiveFields": true,
    "SensitiveFieldNames": ["PASSWORD", "APIKEY", "TOKEN", "SECRET"]
  }
}
```

#### 3. Deploy to Server

**On SRXWEBAPP1:**
```powershell
# Stop IIS site
Stop-IISSite -Name "MOVEX-Portal"

# Backup existing deployment
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
Copy-Item "C:\inetpub\wwwroot\MOVEX-Portal" `
          "D:\AppBackups\MOVEX-Portal\backup-$timestamp" -Recurse

# Copy new files
Remove-Item "C:\inetpub\wwwroot\MOVEX-Portal\*" -Recurse -Force
Copy-Item "\\DEVPC\Deploy\MOVEX-Portal\*" `
          "C:\inetpub\wwwroot\MOVEX-Portal\" -Recurse

# Set permissions
icacls "C:\inetpub\wwwroot\MOVEX-Portal" /grant "IIS AppPool\MOVEX-Portal:(OI)(CI)RX" /T

# Create logs directory
New-Item -Path "C:\Logs\MOVEX-Portal" -ItemType Directory -Force
icacls "C:\Logs\MOVEX-Portal" /grant "IIS AppPool\MOVEX-Portal:(OI)(CI)M" /T

# Start IIS site
Start-IISSite -Name "MOVEX-Portal"

# Verify app pool started
Get-IISAppPool -Name "MOVEX-Portal" | Select-Object Name, State
```

#### 4. Smoke Test

```powershell
# Test health endpoint
Invoke-WebRequest -Uri "https://srxwebapp1.srxglobal.com/health" -UseBasicParsing

# Expected: 200 OK, response "Healthy"
```

---

## 🔍 Monitoring & Maintenance

### Windows Event Logs

**Application Event Log:**
```
Source: ASP.NET Core 8.0
Event IDs:
  - 1000: Application started
  - 1001: Application shutting down
  - 1002: Application crashed
```

**IIS Event Log:**
```
Source: IIS-W3SVC-WP
Event IDs:
  - 2268: Worker process failed to initialize
  - 2276: Application pool recycled
```

### Performance Counters

**Recommended Counters:**
```
- ASP.NET Core\Requests Per Sec
- ASP.NET Core\Current Requests
- .NET CLR Memory\# Bytes in all Heaps
- Processor\% Processor Time
- Memory\Available MBytes
```

### Health Check Monitoring

**Automated Health Check (PowerShell):**
```powershell
# Run every 5 minutes via Task Scheduler
$healthUrl = "https://srxwebapp1.srxglobal.com/health"
$response = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 10

if ($response.StatusCode -ne 200) {
    # Send alert email
    Send-MailMessage -From "monitoring@srxglobal.com" `
                     -To "it@srxglobal.com" `
                     -Subject "ALERT: MOVEX-Portal Health Check Failed" `
                     -Body "Status: $($response.StatusCode)" `
                     -SmtpServer "smtp.srxglobal.com"
}
```

### Log Rotation

**Serilog (auto-rotation):**
- Logs rotate daily at midnight
- Retain 90 days
- Location: `C:\Logs\MOVEX-Portal\`

**SQL Audit Logs:**
- Retain 7 years (2557 days)
- Monthly review for anomalies
- Quarterly backup to archive storage

---

## 🔄 Backup & Recovery

### Application Backup

**Automated Backup (PowerShell):**
```powershell
# Schedule: Daily at 2:00 AM
$sourcePath = "C:\inetpub\wwwroot\MOVEX-Portal"
$backupPath = "D:\AppBackups\MOVEX-Portal"
$timestamp = Get-Date -Format "yyyyMMdd"

# Full backup
Copy-Item $sourcePath -Destination "$backupPath\$timestamp" -Recurse

# Retain 30 days
Get-ChildItem $backupPath -Directory | 
    Where-Object { $_.CreationTime -lt (Get-Date).AddDays(-30) } | 
    Remove-Item -Recurse -Force
```

### Database Backup

**SQL Server Backup Plan:**
```sql
-- Full backup daily at 1:00 AM
BACKUP DATABASE [MovexPortal_Audit]
TO DISK = N'E:\SQLBackups\MovexPortal_Audit_Full.bak'
WITH INIT, COMPRESSION;

-- Retain 7 days of backups
```

### Recovery Procedure

**Application Recovery:**
1. Stop IIS site
2. Restore files from `D:\AppBackups\MOVEX-Portal\{date}`
3. Start IIS site
4. Verify health endpoint

**Database Recovery:**
1. Stop IIS site (prevent writes)
2. Restore database from backup
3. Verify data integrity
4. Start IIS site
5. Test login & audit logging

**RTO (Recovery Time Objective)**: 1 hour  
**RPO (Recovery Point Objective)**: 24 hours

---

## 🔐 Security Hardening

### Windows Firewall Rules

**Inbound Rules:**
```powershell
# Allow HTTPS from internal network only
New-NetFirewallRule -DisplayName "MOVEX-Portal HTTPS" `
                    -Direction Inbound `
                    -Protocol TCP `
                    -LocalPort 443 `
                    -RemoteAddress 192.168.1.0/24 `
                    -Action Allow

# Block all other HTTPS
New-NetFirewallRule -DisplayName "Block External HTTPS" `
                    -Direction Inbound `
                    -Protocol TCP `
                    -LocalPort 443 `
                    -Action Block
```

### TLS Configuration

**Registry Settings (require TLS 1.2+):**
```powershell
# Disable TLS 1.0
New-Item 'HKLM:\SYSTEM\CurrentControlSet\Control\SecurityProviders\SCHANNEL\Protocols\TLS 1.0\Server' -Force
New-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\SecurityProviders\SCHANNEL\Protocols\TLS 1.0\Server' -Name 'Enabled' -Value '0' -PropertyType 'DWord' -Force

# Disable TLS 1.1
New-Item 'HKLM:\SYSTEM\CurrentControlSet\Control\SecurityProviders\SCHANNEL\Protocols\TLS 1.1\Server' -Force
New-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\SecurityProviders\SCHANNEL\Protocols\TLS 1.1\Server' -Name 'Enabled' -Value '0' -PropertyType 'DWord' -Force

# Enable TLS 1.2
New-Item 'HKLM:\SYSTEM\CurrentControlSet\Control\SecurityProviders\SCHANNEL\Protocols\TLS 1.2\Server' -Force
New-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\SecurityProviders\SCHANNEL\Protocols\TLS 1.2\Server' -Name 'Enabled' -Value '1' -PropertyType 'DWord' -Force

# Enable TLS 1.3 (Windows Server 2022+)
New-Item 'HKLM:\SYSTEM\CurrentControlSet\Control\SecurityProviders\SCHANNEL\Protocols\TLS 1.3\Server' -Force
New-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\SecurityProviders\SCHANNEL\Protocols\TLS 1.3\Server' -Name 'Enabled' -Value '1' -PropertyType 'DWord' -Force
```

### Antivirus Exclusions

**Windows Defender Exclusions:**
```powershell
# Exclude application files (performance)
Add-MpPreference -ExclusionPath "C:\inetpub\wwwroot\MOVEX-Portal"

# Exclude logs (I/O performance)
Add-MpPreference -ExclusionPath "C:\Logs\MOVEX-Portal"

# Exclude .NET runtime directories
Add-MpPreference -ExclusionPath "C:\Program Files\dotnet"
```

---

## 📊 Capacity Planning

### Growth Projections (3 Years)

| Year | Users | Requests/Day | Storage (Audit) |
|------|-------|--------------|-----------------|
| **2026** | 30 | 500 | 2 GB |
| **2027** | 50 | 1,000 | 5 GB |
| **2028** | 75 | 2,000 | 10 GB |

### Scale-Out Options (Phase 2+)

**Load Balancing:**
```
             ┌──────────────┐
             │ Load Balancer│
             │  (IIS ARR)   │
             └──────┬───────┘
                    │
       ┌────────────┼────────────┐
       │            │            │
┌──────▼──────┐ ┌──▼─────────┐ ┌▼───────────┐
│ SRXWEBAPP1  │ │ SRXWEBAPP2 │ │ SRXWEBAPP3 │
│ (Portal)    │ │ (Portal)   │ │ (Portal)   │
└─────────────┘ └────────────┘ └────────────┘
       │            │            │
       └────────────┼────────────┘
                    │
              ┌─────▼──────┐
              │  SRXDB01   │
              │  (SQL HA)  │
              └────────────┘
```

---

## 🔗 References

### Internal Documentation
- [System Architecture](02-system-architecture.md)
- [Technology Stack](03-technology-stack.md)
- [Runbook](runbook.md) (to be created)

### External Resources
- [IIS Configuration Reference](https://docs.microsoft.com/en-us/iis/configuration/)
- [ASP.NET Core Hosting](https://docs.microsoft.com/en-us/aspnet/core/host-and-deploy/iis/)
- [SQL Server Best Practices](https://docs.microsoft.com/en-us/sql/relational-databases/security/)

---

**Document Status**: ✅ Complete
**Next Review**: Pre-deployment (Phase 1 MVP)
**Owner**: IT Manager

---

## MyInvois.Api Dependency (Invoice Extract)

**Last Updated**: 2026-03-11

### Dependency Overview

SM-Portal's Invoice Extract feature delegates all data access to **MyInvois.Api**, a separate
ASP.NET Core service that runs as its own IIS site on port 5051. SM-Portal calls
`GET http://localhost:5051/api/v1/invoices` via an `InvoiceApiClient` HTTP client registered in
DI with Polly resilience (retries + circuit breaker).

**SM-Portal does NOT hold DB2 credentials.** All IBM DB2 / AS400 access is encapsulated
exclusively within MyInvois.Api. Do not configure `MovexDb:ConnectionString` in SM-Portal's
secrets, appsettings, or environment variables — see the explicit prohibition below.

```
Browser
  └─► SM-Portal /api/invoices  (Windows AD auth)
        └─► MyInvois.Api :5051/api/v1/invoices  (API-key auth)
              └─► IBM DB2 / AS400 (MVXCOBJ schema)
```

---

### User Secret: SM-Portal Context

The only secret SM-Portal needs for Invoice Extract is the API key that matches
MyInvois.Api's configured primary key.

```bash
# Run from c:/Projects/SM-Portal/src/
dotnet user-secrets set "MyInvoisApi:ApiKey" "<same value as MyInvois.Api ApiKeys:Primary>"
```

`MyInvoisApi:BaseUrl` defaults to `http://localhost:5051/` in `appsettings.json` and normally
does not need to be overridden. Only change it if MyInvois.Api is deployed on a different host
or port.

---

### Startup Order

MyInvois.Api's IIS site **must be running** before SM-Portal begins serving invoice requests.
If MyInvois.Api is unavailable at the time of a request, Polly will retry with exponential
backoff and eventually open the circuit breaker. Users will see an error message during this
window, but no data loss occurs — retries resume automatically when MyInvois.Api recovers.

**Recommended startup sequence on SRXWEBAPP1:**

1. Start (or verify running): IIS site **MyInvois.Api** (port 5051)
2. Start: IIS site **SM-Portal** (port 80 / 443)

---

### End-to-End Verification

After deploying both services, perform this smoke test from a browser logged in with a
domain account:

1. Navigate to `http://srxwebapp1.srxglobal.com/invoices`
2. Enter a date range (e.g., last 30 days) and click **Load**
3. Confirm the invoice table populates with rows
4. Click **Export to Excel** and confirm the `.xlsx` file downloads correctly

If the table is empty, widen the date range. If an error banner appears, check that
MyInvois.Api is running and that the `MyInvoisApi:ApiKey` user-secret has been set.

---

### What NOT to Configure in SM-Portal

| Setting | Must NOT appear in SM-Portal | Reason |
|---------|------------------------------|--------|
| `MovexDb:ConnectionString` | Any SM-Portal config, appsettings, or user-secrets | DB2 access is exclusively in MyInvois.Api |
| `MyInvois:CertificateThumbprint` | Any SM-Portal config | LHDN certificate is MyInvois.Api concern only |
| `MyInvois:TaxpayerTIN` | Any SM-Portal config | LHDN identity is MyInvois.Api concern only |

Adding DB2 credentials to SM-Portal would violate the architectural boundary and expose
AS400 credentials to the web-facing layer unnecessarily.
