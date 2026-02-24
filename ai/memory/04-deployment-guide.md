# MOVEX-Portal - Deployment Guide

**Last Updated**: 2026-02-04  
**Status**: Phase 1 - Foundation  
**Version**: 0.1.0 (Pre-Alpha)

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
│       └── MOVEX-Portal\     # Application files
├── Logs\
│   └── MOVEX-Portal\         # Application logs
└── Windows\

D:\                           # Data & Backups
├── AppBackups\
│   └── MOVEX-Portal\
└── LogArchive\
```

---

## 🔧 IIS Configuration

### Application Pool Settings

**Name**: `MOVEX-Portal`

```ini
[General]
.NET CLR Version             = No Managed Code
Managed Pipeline Mode        = Integrated
Start Mode                   = AlwaysRunning
Enable 32-Bit Applications   = False

[Process Model]
Identity                     = ApplicationPoolIdentity
Idle Time-out (minutes)      = 20
Maximum Worker Processes     = 1
Ping Enabled                 = True
Ping Maximum Response Time   = 90 seconds

[Recycling]
Regular Time Interval (minutes) = 1740 (29 hours - avoid daily patterns)
Private Memory Limit (KB)       = 0 (disabled)
Virtual Memory Limit (KB)       = 0 (disabled)
Request Limit                   = 0 (disabled)

[CPU]
Limit (percentage)           = 0 (no limit)
Limit Action                 = NoAction

[Advanced]
Rapid-Fail Protection Enabled = True
Failure Interval (minutes)    = 5
Maximum Failures              = 5
```

### Website Configuration

**Name**: `MOVEX-Portal`

```ini
[Site Bindings]
Protocol = https
IP Address = * (All Unassigned)
Port = 443
Host Name = srxwebapp1.srxglobal.com
SSL Certificate = srxwebapp1.srxglobal.com (SHA-256)

[Physical Path]
Path = C:\inetpub\wwwroot\MOVEX-Portal

[Application Pool]
Application Pool = MOVEX-Portal

[Authentication]
Anonymous Authentication = Disabled
Windows Authentication   = Enabled
  - Providers: Negotiate, NTLM (in order)
  - Extended Protection: Accept
  - Kernel-mode authentication: Enabled

[Authorization Rules]
Allow = SRXGLOBAL\Domain Users
```

### Web.config (Auto-generated)

```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <location path="." inheritInChildApplications="false">
    <system.webServer>
      <!-- ASP.NET Core Module -->
      <handlers>
        <add name="aspNetCore" path="*" verb="*" 
             modules="AspNetCoreModuleV2" 
             resourceType="Unspecified" />
      </handlers>
      <aspNetCore processPath="dotnet" 
                  arguments=".\Movex.Portal.dll" 
                  stdoutLogEnabled="true" 
                  stdoutLogFile=".\logs\stdout" 
                  hostingModel="InProcess">
        <environmentVariables>
          <environmentVariable name="ASPNETCORE_ENVIRONMENT" value="Production" />
        </environmentVariables>
      </aspNetCore>

      <!-- Security Headers -->
      <httpProtocol>
        <customHeaders>
          <add name="X-Content-Type-Options" value="nosniff" />
          <add name="X-Frame-Options" value="DENY" />
          <add name="X-XSS-Protection" value="1; mode=block" />
          <add name="Strict-Transport-Security" value="max-age=31536000; includeSubDomains" />
          <add name="Content-Security-Policy" 
               value="default-src 'self'; script-src 'self' 'unsafe-inline' cdn.jsdelivr.net code.jquery.com; style-src 'self' 'unsafe-inline' cdn.jsdelivr.net; font-src 'self' cdn.jsdelivr.net;" />
          <remove name="X-Powered-By" />
          <remove name="Server" />
        </customHeaders>
      </httpProtocol>

      <!-- IP Restrictions -->
      <security>
        <ipSecurity allowUnlisted="false">
          <add ipAddress="192.168.1.0" subnetMask="255.255.255.0" allowed="true" />
        </ipSecurity>
        <authentication>
          <windowsAuthentication enabled="true">
            <providers>
              <add value="Negotiate" />
              <add value="NTLM" />
            </providers>
          </windowsAuthentication>
          <anonymousAuthentication enabled="false" />
        </authentication>
      </security>

      <!-- URL Rewrite (HTTPS enforcement) -->
      <rewrite>
        <rules>
          <rule name="HTTPS Redirect" stopProcessing="true">
            <match url="(.*)" />
            <conditions>
              <add input="{HTTPS}" pattern="off" />
            </conditions>
            <action type="Redirect" url="https://{HTTP_HOST}/{R:1}" redirectType="Permanent" />
          </rule>
        </rules>
      </rewrite>

      <!-- Request Filtering -->
      <security>
        <requestFiltering>
          <requestLimits maxAllowedContentLength="10485760" /> <!-- 10 MB -->
          <verbs>
            <add verb="TRACE" allowed="false" />
            <add verb="OPTIONS" allowed="false" />
          </verbs>
        </requestFiltering>
      </security>
    </system.webServer>
  </location>
</configuration>
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
