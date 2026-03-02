# SM-Portal IIS Deployment Runbook

**Version**: 1.1 (Updated with Frontend Build Process)
**Last Updated**: Feb 25, 2026  
**Purpose**: Step-by-step guide for deploying SM-Portal (backend API + React frontend) to IIS  
**Target Audience**: DevOps engineers, system administrators  
**Estimated Time**: 60-120 minutes (includes backend .NET and frontend npm builds)

**NEW in v1.1:** Added React/Vite frontend build process, GUI-based npm instructions, and integrated deployment options

---

## 🎯 Deployment Overview

SM-Portal is a **full-stack application** with two separate build processes:

```
┌─────────────────────────────────────────────────────────────┐
│ SM-Portal Repository                                        │
├──────────────────────┬──────────────────────────────────────┤
│ src/ (Backend)       │ frontend/ (React+Vite UI)           │
│ .NET 8.0 API         │ Node.js + npm                       │
│                      │                                      │
│ Build: dotnet        │ Build: npm                          │
│ Output: DLLs         │ Output: dist/ (HTML/CSS/JS)        │
│                      │                                      │
│ Runs on: IIS/Windows │ Served from: wwwroot or CDN         │
└──────────────────────┴──────────────────────────────────────┘
```

**Build Sequence:**
1. Clone repo
2. Build backend: `dotnet restore && dotnet publish`
3. Build frontend: `npm install && npm run build`
4. Deploy both to IIS (integrated or separate)

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [GUI vs PowerShell](#-gui-vs-powershell-choose-your-approach)
3. [Pre-Deployment Checklist](#pre-deployment-checklist)
4. [Environment Setup](#environment-setup)
5. [Build Preparation](#build-preparation)
   - 1. Clone/Update Repository
   - 2. Configure Appsettings
   - 3. Configure Connection String
   - 4. Build Backend Application
   - 5. Build Frontend (React/Vite) - **NEW**
   - 6. Validate Build Artifacts (Backend & Frontend) - **NEW**
   - 7. Prepare Integrated Deployment Package - **NEW**
6. [IIS Configuration](#iis-configuration)
7. [Application Deployment](#application-deployment)
8. [Post-Deployment Verification](#post-deployment-verification)
9. [Troubleshooting](#troubleshooting)
10. [GUI-Based Troubleshooting Dashboard](#gui-based-troubleshooting-dashboard)
11. [Rollback Procedures](#rollback-procedures)

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
- **Node.js 18+ with npm** (for frontend build - **NEW**)
  - Download from: https://nodejs.org/
  - Verify: `npm --version` (should show 9.0+ and `node --version` shows 18.0+)

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
- [ ] Backend build succeeds: `dotnet publish -c Release`
- [ ] **Frontend build succeeds: `npm install && npm run build`** (NEW)
  - Verify: `frontend/dist/index.html` exists
  - Verify: `frontend/dist/assets/` contains .js and .css files
- [ ] No hardcoded credentials in source code
- [ ] Build artifacts documented (version, commit hash, both backend and frontend)

### Environment Setup

- [ ] Target server identified (hostname, IP)
- [ ] IIS 10.0+ installed and running
- [ ] .NET 8.0 Hosting Bundle installed
  - Verify with: `dotnet --version` and check IIS module
- [ ] **Node.js 18+ with npm installed** (for frontend build) (NEW)
  - Verify with: `node --version` and `npm --version`
  - Download: https://nodejs.org/ if not installed
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

## 🖥️ GUI vs PowerShell: Choose Your Approach

This runbook provides **both GUI-based and PowerShell-based** instructions for every task. Choose the approach that works best for your team:

### GUI Approach (Recommended for beginners)
- **Best for**: Less experienced DevOps engineers, visual learners, administrators who prefer GUIs
- **Tools**: IIS Manager, Windows Server Manager, Event Viewer, File Explorer
- **Speed**: Slower but more visible and straightforward
- **Error recovery**: Easier to troubleshoot with visual feedback
- **Learning curve**: Easier to follow step-by-step

### PowerShell Approach (Recommended for automation)
- **Best for**: Experienced admins, scripting/automation, repeated deployments
- **Tools**: PowerShell console, text editors
- **Speed**: Faster for repeated operations
- **Error recovery**: Requires scripting knowledge
- **Learning curve**: Steeper, requires PowerShell experience

### Hybrid Approach (Recommended for production)
- Use **GUI for initial setup** (create app pools, websites, certificates)
- Use **PowerShell for validation and troubleshooting** (check status, run tests)
- Use **PowerShell scripts for operational tasks** (backups, monitoring)

### Quick Reference: Which Section to Read?

| Task | GUI Location | PowerShell Location |
|------|--------------|-------------------|
| Install Windows Auth | Section 2, Option A (GUI) | Section 2, Option B & C |
| Create App Pool | IIS Configuration, Step 1-4 | Environment Setup, Step 5 |
| Create Website | IIS Configuration, Step 1  | IIS Configuration, Step 1 |
| Install Certificate | IIS Configuration, Step 2 | IIS Configuration, Step 2 |
| Deploy Files | Application Deployment, Step 2 | Application Deployment, Step 2 |
| Restart IIS | Application Deployment, Step 4 | Application Deployment, Step 4 |
| View Logs | GUI Troubleshooting Dashboard | IIS Logs Review |
| Monitor Performance | Performance Monitoring, Option C-D | Performance Monitoring, Option A |

### How to Use This Runbook

**For GUI-based deployment:**
1. Read prerequisites
2. Follow "GUI Approach" section for each step
3. Skip PowerShell code blocks
4. Refer to GUI Troubleshooting Dashboard for issues

**For PowerShell automation:**
1. Read prerequisites  
2. Follow PowerShell code blocks
3. Adapt scripts for your environment
4. Use PowerShell troubleshooting commands

**For mixed approach:**
1. Use GUI for one-time setup
2. Use PowerShell for validation and ongoing operations
3. Use both for troubleshooting (GUI for overview, PowerShell for details)

---

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

### 2. Install Windows Authentication (IIS Role Service)

**Windows Authentication is NOT installed by default with IIS. You must add it.**

#### Option A: Install via Server Manager - Add Roles and Features (Detailed GUI Steps)

**Step 1: Open Add Roles and Features Wizard**
1. Open **Server Manager**
   - Click **Start** → Search for "Server Manager" → Open it
2. Click **Manage** button in top-right corner
3. Select **Add Roles and Features**
4. Click **Next** at "Before You Begin" screen

**Step 2: Select Installation Type**
- Radio button: Select **"Role-based or feature-based installation"** (should be default)
- Click **Next**

**Step 3: Select Destination Server**
- Your server should already be selected (highlighted in blue)
- Example: `WIN-ABC123.company.local` or your server name
- Click **Next**

**Step 4: Select Server Roles**
- **IMPORTANT**: Look for **"Web Server (IIS)"** checkbox
- ✓ **CHECK** the **Web Server (IIS)** checkbox
  - This will appear in the main list (not nested)
  - When checked, it may prompt: "Add features required for Web Server (IIS)?"
  - Click **Add Features** button to include dependencies
- Click **Next**

**Step 5: Select Features** (keep defaults)
- Just click **Next** here (defaults are fine)

**Step 6: Select Role Services for Web Server (IIS)**
- This is the KEY screen for authentication!
- You'll see a tree structure with checkboxes:

```
[X] Web Server (IIS)
    [X] Web Server
        [X] Common HTTP Features
        [X] Health and Diagnostics
        [X] Performance Features
        [ ] Security  ← EXPAND THIS ONE
            [ ] Basic Authentication
            [X] Windows Authentication  ← CHECK THIS!
            [ ] Digest Authentication
            [ ] URL Authorization
            [ ] Request Filtering
            [ ] IP and Domain Restrictions
        [X] Application Development
    [X] Management Tools
```

**Detailed Steps for Step 6:**
1. Look at the **Security** node (it may be collapsed with a + sign)
2. **Click the [+] next to Security** to expand child items
3. You'll see several authentication options:
   - Basic Authentication (unchecked)
   - **Windows Authentication** (CHECK THIS BOX)
   - Digest Authentication (unchecked)
   - URL Authorization (unchecked)
   - Request Filtering (may already be checked)
   - IP and Domain Restrictions (unchecked)
4. **Place checkmark in the box next to "Windows Authentication"**
5. Verify box shows: **☑ Windows Authentication**
6. Click **Next**

**Step 7: Confirm Installation Selections**
- Review the summary showing:
  - Web Server (IIS) [Role Selected]
  - Windows Authentication [Feature Selected]
- Click **Install**

**Step 8: Wait for Installation**
- Progress bar will show: "Installation succeeded on [server name]"
- May prompt for server restart (click **Yes** if asked)
- When complete, click **Close**

**Step 9: Restart IIS (if not automatically restarted)**
```powershell
iisreset /restart
```

**Step 10: Verify Installation**
1. Open **IIS Manager** (Win + R → `inetmgr`)
2. In left panel, expand your server name
3. Click on any **Website** (or create one)
4. In the center panel (Features View), find and **double-click "Authentication"**
5. You should now see **Windows Authentication** in the list
6. Status should show **Enabled** or have an **Enable** option in the right panel

---

#### Option A (Alt): Install via Windows Features (Simple Method)

1. **Open Windows Features**
   - Press `Win + R` and type `optionalfeatures`, then Enter
   - Or: Server Manager → Manage → Add Roles and Features (see detailed steps above)

2. **Navigate to IIS Authentication Services**
   - Expand **Internet Information Services**
   - Expand **World Wide Web Services**
   - Expand **Security**

3. **Check Windows Authentication**
   - Look for **Windows Authentication** checkbox
   - ✓ Check it if not already checked
   - Click **OK**

4. **Wait for Installation**
   - Windows will install the feature (may require restart)
   - Restart IIS when complete: `iisreset /restart`

5. **Verify Installation**
   - Open IIS Manager (inetmgr)
   - Click on any site
   - Double-click **Authentication** in Features View
   - You should now see **Windows Authentication** listed

#### Option B: Install via PowerShell

```powershell
# Install Windows Authentication feature
Add-WindowsFeature Web-Windows-Auth

# Verify installation
Get-WindowsFeature Web-Windows-Auth | Select-Object Name, Installed

# Expected output:
# Name                             Installed
# ----                             ---------
# [X] Web Server (IIS)             True
#   [X] Security                   True
#     [X] Windows Authentication   True

# Restart IIS
iisreset /restart
```

#### Option C: Install via DISM Command Line

```powershell
# List available IIS features
dism /online /get-features | Select-String "IIS"

# Install Windows Authentication
dism /online /enable-feature /featurename:IIS-WindowsAuthentication

# Verify
dism /online /get-featureinfo /featurename:IIS-WindowsAuthentication
```

### 3. Create SQL Server Database & Audit Log Table

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

### 4. Create Windows AD Groups for RBAC

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

### 5. Configure App Pool Identity

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

#### Option A: PowerShell Command Line

```powershell
# Clone repository (first time)
git clone git@github.com:company/SM-Portal.git C:\Deploy\SM-Portal

# Or update existing clone
cd C:\Deploy\SM-Portal
git pull origin master
git checkout <tag-or-commit-hash>  # Use specific version if available
```

#### Option B: Git GUI/Visual Studio

1. **Open Git Bash or Visual Studio**
   - Visual Studio Code: Open terminal → Run in powershell
   - Or open **Git GUI** (right-click Desktop → Git Bash Here)

2. **Clone Repository**
   - File → Clone Existing Repository
   - **Repository URL**: `git@github.com:company/SM-Portal.git`
   - **Target directory**: `C:\Deploy\SM-Portal`
   - Click **Clone**

3. **Pull Latest Changes**
   - Remote → Fetch from origin
   - Merge → Merge in Current Branch
   - Or use **Git Fetch** followed by **Merge**

### 2. Configure Appsettings

#### Option A: PowerShell

```powershell
# Copy template to deployment location
cp C:\Deploy\SM-Portal\src\appsettings.json `
   C:\Deploy\SM-Portal\src\appsettings.Production.json

# Edit production settings
notepad C:\Deploy\SM-Portal\src\appsettings.Production.json
```

#### Option B: File Explorer & Notepad GUI

1. **Open File Explorer**
   - Press `Win + E` or search for "File Explorer"

2. **Navigate to Source Directory**
   - Address bar: `C:\Deploy\SM-Portal\src`
   - Look for `appsettings.json`

3. **Copy appsettings.json**
   - Right-click `appsettings.json`
   - Select **Copy**
   - Right-click in empty space → **Paste**
   - Rename the copy to `appsettings.Production.json`

4. **Edit appsettings.Production.json**
   - Right-click `appsettings.Production.json`
   - Select **Open with** → **Notepad** (or Visual Studio Code)
   - Edit the file with appropriate production values
   - Save (`Ctrl + S`)

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

#### Option A: User Secrets (Development via GUI)

1. **Open Visual Studio**
   - File → Open → Project/Solution
   - Navigate to: `C:\Deploy\SM-Portal\src\SM-Portal.csproj`

2. **Initialize User Secrets via Visual Studio**
   - In Solution Explorer, right-click project
   - Select **Manage User Secrets**
   - This opens `secrets.json` file

3. **Add Connection String**
   ```json
   {
     "ConnectionStrings": {
       "AuditLog": "Server=SQL-SERVER;Database=SM_Portal_Audit;User ID=IIS_SMPortal;Password=YourPassword;Encrypt=true;"
     }
   }
   ```
   - Save file (`Ctrl + S`)

#### Option B: Environment Variables (Production via GUI)

1. **Open Environment Variables Dialog**
   - Press `Win + Pause/Break` (or right-click **This PC** → **Properties**)
   - Click **Advanced system settings**
   - Click **Environment Variables** button

2. **Add System Environment Variable**
   - Under **System variables**, click **New...**
   - **Variable name**: `ConnectionStrings__AuditLog`
   - **Variable value**: `Server=SQL-SERVER;Database=SM_Portal_Audit;User ID=IIS_SMPortal;Password=YourPassword;Encrypt=true;`
   - Click **OK**

3. **Verify Variable (PowerShell)**
   - Open PowerShell as Admin
   - Run: `[Environment]::GetEnvironmentVariable("ConnectionStrings__AuditLog", "Machine")`
   - Should display the connection string

4. **Restart IIS After Adding Variable**
   - Changes to environment variables require app pool restart
   - In IIS Manager: **Application Pools** → Right-click **SMPortalPool** → **Cycle**

#### Option C: PowerShell Method

```powershell
cd C:\Deploy\SM-Portal\src

# Initialize User Secrets
dotnet user-secrets init

# Set connection string
dotnet user-secrets set "ConnectionStrings:AuditLog" `
  "Server=SQL-SERVER;Database=SM_Portal_Audit;User ID=IIS_SMPortal;Password=YourPassword;Encrypt=true;"

# Verify (stored in: C:\Users\[username]\AppData\Roaming\Microsoft\UserSecrets\...)
dotnet user-secrets list
```

### 4. Build Application

#### Option A: PowerShell Command Line

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

#### Option B: Visual Studio GUI

1. **Open Visual Studio**
   - File → Open → Project/Solution
   - Navigate to: `C:\Deploy\SM-Portal\src\SM-Portal.csproj`

2. **Restore Dependencies**
   - In Solution Explorer, right-click solution
   - Select **Restore NuGet Packages**
   - Wait for restore to complete

3. **Run Tests**
   - Test → Run All Tests
   - Or: Test Explorer (View → Test Explorer)
   - Click **Run All Tests** button
   - Review test results in Test Explorer window

4. **Publish Release Build**
   - Right-click project in Solution Explorer
   - Select **Publish...**
   - **Publish mode**: Select **Folder** (Runtime self-contained or Framework-dependent)
   - **Target location**: `C:\Deploy\SM-Portal-Release`
   - Click **Finish** or **Publish**

5. **Verify Published Files**
   - Windows Explorer: `C:\Deploy\SM-Portal-Release`
   - Should contain:
     - `SM-Portal.dll`
     - `SM-Portal.runtimeconfig.json`
     - `appsettings.json`
     - Dependencies folder

### 5. Build Frontend (React/Vite)

**IMPORTANT:** The frontend must be built **separately** using npm. The .NET build only creates backend files.

#### Option A: PowerShell Command Line

```powershell
# Navigate to frontend directory
cd C:\Deploy\SM-Portal\frontend

# Install npm dependencies
npm install

# Build React/TypeScript application (creates dist/ folder)
npm run build

# Verify build output
ls dist/
# Should contain: index.html, assets/ folder with .js and .css files
```

#### Option B: Visual Studio Code & Terminal GUI

1. **Open Visual Studio Code**
   - File → Open Folder
   - Select: `C:\Deploy\SM-Portal\frontend`
   - Click **Select Folder**

2. **Open Terminal in VS Code**
   - View → Terminal (or `Ctrl + backtick`)
   - Terminal should open showing: `C:\Deploy\SM-Portal\frontend`

3. **Install Dependencies**
   - In terminal, run: `npm install`
   - Wait for all packages to download (may take 1-2 minutes)
   - You'll see new folder: `node_modules/` with thousands of packages

4. **Build Production Bundle**
   - In terminal, run: `npm run build`
   - Watch for output:
     ```
     ✓ 123 modules transformed
     built in 2.34s
     
     C:/Deploy/SM-Portal/frontend/dist/
     ├─ index.html      0.92 kB
     ├─ assets/
     │  ├─ index-ABC.js    145.23 kB │ gzip: 45.67 kB
     │  └─ index-DEF.css   8.45 kB  │ gzip: 2.15 kB
     ```

5. **Verify Frontend Build**
   - In VS Code file explorer, you should see new folder: `dist/`
   - Expand it and verify:
     - `index.html` file exists
     - `assets/` folder contains `.js` and `.css` files

#### Option C: Node.js Command Prompt (Simple GUI)

1. **Open Command Prompt (Not PowerShell)**
   - Press `Win + R`, type `cmd`, press Enter

2. **Navigate to Frontend**
   ```cmd
   cd C:\Deploy\SM-Portal\frontend
   ```

3. **Check npm is Available**
   ```cmd
   npm --version
   ```
   - Should display version number (e.g., `9.8.1`)
   - If not found, install Node.js from https://nodejs.org/

4. **Install and Build**
   ```cmd
   npm install
   npm run build
   ```
   - Wait for completion
   - Look for: `dist/` folder created in file explorer

#### Option D: Node Package Manager GUI (npm GUI - Optional)

If you prefer a graphical interface:

1. **Install npm-gui (optional tool)**
   ```powershell
   npm install -g npm-gui
   npm-gui
   ```

2. **Use GUI**
   - Opens browser interface to manage npm tasks
   - Select `build` task and click **Run**

**Frontend Build Troubleshooting:**

| Error | Solution |
|-------|----------|
| `npm: command not found` | Install Node.js from https://nodejs.org/ (includes npm) |
| `node_modules` permissions error | Run `npm install` as Administrator |
| Build takes >5 minutes | Likely npm install phase; can be slow first time |
| `dist/` folder not created | Check for error messages above; re-run `npm run build` |
| TypeScript compilation errors | Check `src/` files for syntax errors; Try `npm run lint` to find issues |

### 6. Validate Build Artifacts (Backend & Frontend)

#### Option A: PowerShell Validation

```powershell
# Check backend files
Write-Host "=== Backend Build Validation ===" -ForegroundColor Cyan
$backendPath = "C:\Deploy\SM-Portal-Release"
$backendFiles = @(
  "SM-Portal.dll",
  "SM-Portal.runtimeconfig.json",
  "appsettings.json"
)

foreach ($file in $backendFiles) {
  if (Test-Path "$backendPath\$file") {
    Write-Host "✓ $file found" -ForegroundColor Green
  } else {
    Write-Host "✗ $file MISSING" -ForegroundColor Red
  }
}

# Check frontend files
Write-Host "`n=== Frontend Build Validation ===" -ForegroundColor Cyan
$frontendPath = "C:\Deploy\SM-Portal\frontend\dist"

if (Test-Path "$frontendPath\index.html") {
  Write-Host "✓ index.html found" -ForegroundColor Green
} else {
  Write-Host "✗ index.html MISSING" -ForegroundColor Red
}

if (Test-Path "$frontendPath\assets") {
  $jsFiles = @(Get-ChildItem "$frontendPath\assets" -Filter "*.js" -ErrorAction SilentlyContinue).Count
  $cssFiles = @(Get-ChildItem "$frontendPath\assets" -Filter "*.css" -ErrorAction SilentlyContinue).Count
  
  if ($jsFiles -gt 0 -and $cssFiles -gt 0) {
    Write-Host "✓ assets/ folder found with $jsFiles JS files and $cssFiles CSS files" -ForegroundColor Green
  } else {
    Write-Host "✗ assets/ folder missing JS or CSS files" -ForegroundColor Red
  }
} else {
  Write-Host "✗ assets/ folder MISSING" -ForegroundColor Red
}

Write-Host "`n=== Build Status ===" -ForegroundColor Cyan
if ((Test-Path "$backendPath\SM-Portal.dll") -and (Test-Path "$frontendPath\index.html")) {
  Write-Host "✓ Both backend and frontend builds are ready for deployment" -ForegroundColor Green
} else {
  Write-Host "✗ Build validation FAILED - check errors above" -ForegroundColor Red
}
```

#### Option B: File Explorer Visual Validation

1. **Check Backend Files**
   - Open File Explorer: `C:\Deploy\SM-Portal-Release`
   - Verify you see:
     - ✓ `SM-Portal.dll` (should be recent date)
     - ✓ `SM-Portal.runtimeconfig.json`
     - ✓ `appsettings.json`
     - ✓ `appsettings.Production.json` (if copied)
     - ✓ Multiple `.deps.json` files
   - If missing, rebuild backend: `dotnet publish -c Release -o C:\Deploy\SM-Portal-Release`

2. **Check Frontend Files**
   - Open File Explorer: `C:\Deploy\SM-Portal\frontend\dist`
   - Verify you see:
     - ✓ `index.html` file (main entry point)
     - ✓ `assets/` folder
   - Open `assets/` folder and verify:
     - ✓ `.js` files (e.g., `index-ABC123.js`)
     - ✓ `.css` files (e.g., `index-DEF456.css`)
     - ✓ `.json` files or `.svg` files (manifest/favicon)
   - If missing, rebuild frontend: `cd C:\Deploy\SM-Portal\frontend && npm run build`

3. **Size Check**
   - Right-click `dist/` folder → **Properties**
   - **Size** should show: 200 KB - 2 MB total (reasonable for compiled React app)
   - If 0 bytes, build failed

### 7. Prepare Integrated Deployment Package (Optional)

For **single unified deployment**, you can integrate frontend and backend:

#### Option A: PowerShell - Copy Frontend to Backend wwwroot

```powershell
# Copy frontend dist files to backend wwwroot folder
$frontendDist = "C:\Deploy\SM-Portal\frontend\dist"
$backendWwwroot = "C:\Deploy\SM-Portal-Release\wwwroot"

# Create wwwroot if it doesn't exist
if (-not (Test-Path $backendWwwroot)) {
  New-Item -Path $backendWwwroot -ItemType Directory -Force | Out-Null
}

# Copy all frontend files to wwwroot
Copy-Item -Path "$frontendDist\*" -Destination $backendWwwroot -Recurse -Force

Write-Host "✓ Frontend deployed to backend wwwroot"
Write-Host "Now deploy entire C:\Deploy\SM-Portal-Release to IIS"
```

#### Option B: File Explorer Drag & Drop

1. **Open Two File Explorer Windows**
   - Window 1: `C:\Deploy\SM-Portal\frontend\dist`
   - Window 2: `C:\Deploy\SM-Portal-Release`

2. **Create wwwroot Folder (if missing)**
   - In Window 2, right-click → **New** → **Folder**
   - Name it: `wwwroot`

3. **Copy Frontend Files**
   - In Window 1, select all (`Ctrl + A`)
   - Drag & drop to Window 2's `wwwroot` folder
   - Wait for copy to complete

**Note:** With this approach, IIS serves both:
- Backend API at: `https://sm-portal.company.local/api/`
- Frontend SPA at: `https://sm-portal.company.local/`

---

---

## IIS Configuration

### 1. Create Website in IIS

#### Option A: PowerShell

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

#### Option B: IIS Manager GUI

1. **Open IIS Manager**
   - Press `Win + R`, type `inetmgr`, press Enter
   - Or: Server Manager → Tools → Internet Information Services Manager

2. **Create New Website**
   - In left panel, expand your server name
   - Right-click **Sites** → **Add Website...**
   - Fill in the following fields:
     - **Site name**: `SM-Portal`
     - **Physical path**: `C:\InetPub\SM-Portal` (create the folder first if it doesn't exist)
     - **Binding**:
       - **Type**: `https`
       - **IP address**: `All Unassigned`
       - **Port**: `443`
       - **Host name**: `sm-portal.company.local`
     - **SSL certificate**: (leave blank for now, configure in next step)
     - **Application pool**: `SMPortalPool` (must be created first)
   - Click **OK**

3. **Create HTTP to HTTPS Redirect Website (Optional)**
   - Repeat the above steps with:
     - **Site name**: `SM-Portal-HTTP`
     - **Physical path**: `C:\InetPub\SM-Portal-HTTP` (create this folder too)
     - **Type**: `http`
     - **Port**: `80`
     - **Application pool**: `DefaultAppPool`
   - This allows users accessing http://site to be redirected to https://site

4. **Verify Website Creation**
   - In left panel under **Sites**, you should now see:
     - SM-Portal
     - SM-Portal-HTTP (if created)
   - Both should show status as **Stopped** initially

### 2. Configure SSL/TLS Certificate

#### Option A: PowerShell

```powershell
# Import certificate to Local Machine\Personal store
$cert = Import-PfxCertificate `
  -FilePath "C:\Certs\sm-portal.company.local.pfx" `
  -CertStoreLocation "Cert:\LocalMachine\My" `
  -Password (ConvertTo-SecureString "CertPassword" -AsPlainText -Force)

# Get certificate thumbprint
$thumbprint = $cert.Thumbprint
Write-Host "Certificate thumbprint: $thumbprint"

# Bind certificate to website
$binding = Get-WebBinding -Name "SM-Portal" -Port 443 -Protocol "https"
$binding.AddSslCertificate($thumbprint, "My")

# Verify binding
Get-WebBinding -Name "SM-Portal" -Protocol "https" | Format-List *
```

#### Option B: Certificate Manager & IIS Manager GUI

**Step 1: Import Certificate via Certificate Manager**

1. **Open Certificate Manager**
   - Press `Win + R`, type `certlm.msc`, press Enter
   - Or: Server Manager → Tools → Services → Find "Certificates"

2. **Navigate to Personal Certificates**
   - Expand **Certificates - Local Computer** in left panel
   - Right-click **Personal** → **All Tasks** → **Import...**

3. **Import Certificate File**
   - **File name**: `C:\Certs\sm-portal.company.local.pfx`
   - Click **Next**
   - **Password**: Enter certificate password
   - ✓ Check **Mark this key as exportable**
   - Click **Next**
   - **Certificate Store**: Select **Personal**
   - Click **Next** → **Finish**

4. **Verify Import**
   - In left panel: **Certificates - Local Computer** → **Personal** → **Certificates**
   - You should see your certificate in the list
   - Right-click it → **Open** to verify:
     - **Subject CN**: Should match `sm-portal.company.local`
     - **Valid until**: Check expiration date
     - **Thumbprint**: Note this for reference

**Step 2: Bind Certificate to Website via IIS Manager**

1. **Open IIS Manager** (`Win + R` → `inetmgr`)

2. **Select SM-Portal Website**
   - In left panel: Expand your server → **Sites** → Click **SM-Portal**

3. **Edit HTTPS Binding**
   - In right panel (Actions), look for **Edit Site** section
   - Click **Bindings...**
   - In **Site Bindings** window, select the line with **Type: https, Port: 443**
   - Click **Edit...**

4. **Update SSL Certificate**
   - **SSL certificate**: Click dropdown → Select your certificate
     - Certificate should display as: `sm-portal.company.local`
     - **Thumbprint** or **CN** should be visible
   - ✓ Check **Server Name Indication (SNI)**
   - Click **OK**

5. **Close and Verify**
   - Click **Close** in Site Bindings
   - Back in IIS Manager, HTTPS binding should show certificate thumbprint
   - Verify no errors appear

**Troubleshooting Certificate Binding:**

- If certificate doesn't appear in dropdown, import it first (Step 1)
- If binding fails, verify certificate password is correct
- Certificate CN must match website hostname exactly
- Restart IIS after binding: `iisreset /restart`

### 3. Configure Application Settings

#### Option A: PowerShell

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

#### Option B: IIS Manager GUI

1. **Open IIS Manager** (`Win + R` → `inetmgr`)

2. **Configure Application Pool**
   - In left panel: Expand server → **Application Pools**
   - Right-click **SMPortalPool** → **Advanced Settings...**
   - Look for and configure:
     - **.NET Framework Version**: Set to `No Managed Code`
     - **Managed Pipeline Mode**: Set to `Integrated`
     - **Start Application Pool Immediately**: ✓ checked
     - **Idle Time-out**: `00:30:00` (30 minutes)
   - Click **OK**

3. **Verify Application Pool Assignment**
   - In left panel: **Sites** → Click **SM-Portal**
   - In right panel, verify:
     - **Application Pool**: Shows `SMPortalPool`
   - If wrong, in right panel under **Edit Site** section, click **Basic Settings**
   - Change Application pool to `SMPortalPool`
   - Click **OK**

### 4. Configure URL Rewrite (for redirects)

#### Option A: PowerShell / Web.config

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

#### Option B: IIS Manager GUI - URL Rewrite

1. **Open IIS Manager** (`Win + R` → `inetmgr`)

2. **Select Website**
   - In left panel: **Sites** → Click **SM-Portal-HTTP** (the HTTP site)

3. **Add URL Rewrite Rule**
   - In center panel (Features View), double-click **URL Rewrite**
   - On right side panel, click **Add Rule(s)...**
   - Select **Blank rule**
   - Click **OK**

4. **Configure Rewrite Rule**
   - **Rule name**: `Redirect HTTP to HTTPS`
   - **Pattern**: `.*` (matches all URLs)
   - **Ignore case**: ✓ checked
   - **Action Type**: Dropdown → `Redirect`
   - **Redirect URL**: `https://{HTTP_HOST}{REQUEST_URI}`
   - **Redirect type**: `Permanent (301)` or `Temporary (307)`
   - **Append query string**: ✓ checked
   - Click **Apply** in right panel
   - Click **Back to Rules**

5. **Verify Rule**
   - You should see the rule listed: "Redirect HTTP to HTTPS"
   - Status should show it's enabled

#### Option C: Direct Editing (Web.config)

See the web.config section below

### 5. Set File Permissions

#### Option A: PowerShell

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

#### Option B: File Explorer & Windows Security Properties GUI

1. **Open File Explorer** (`Win + E`)

2. **Navigate to Application Folder**
   - Address bar: `C:\InetPub\SM-Portal`

3. **Open Properties**
   - Right-click folder → **Properties**
   - Click **Security** tab

4. **Edit Permissions**
   - Click **Edit...** (you may need Administrator permission)

5. **Add IIS App Pool User**
   - Click **Add...**
   - **Object type**: Click **Object Types** if needed → ensure **Groups** is checked → **OK**
   - **Enter object name**: `IIS AppPool\SMPortalPool`
   - Click **Check Names** → should become underlined
   - Click **OK**

6. **Assign Permissions**
   - Select the `IIS AppPool\SMPortalPool` entry you just added
   - In **Permissions** section, check the following:
     - ✓ **Read**
     - ✓ **Read & Execute**
     - ✓ **List folder contents**
   - Ensure these are NOT checked:
     - ☐ **Modify**
     - ☐ **Write**
     - ☐ **Delete**
   - Click **Apply** → **OK**

7. **Verify Permissions**
   - Open **Advanced** → **Effective Permissions** tab
   - Select `IIS AppPool\SMPortalPool`
   - Click **Effective Permissions**
   - Verify it shows Read, Read & Execute, List Folder Contents = Allow

8. **Apply to Subdirectories**
   - In **Advanced** button → Check **Replace all child object permissions**
   - Click **Apply**
   - Wait for operation to complete

### Alternative: IIS Manager Console (GUI-Based Configuration)

If you prefer to use the IIS Manager graphical interface instead of PowerShell, follow these steps:

#### 1. Create App Pool (GUI)

1. **Open IIS Manager**
   - Press `Win + R` and type `inetmgr`, then Enter
   - Or: Server Manager → Tools → Internet Information Services Manager

2. **Create New App Pool**
   - Expand server node in left panel
   - Right-click **Application Pools** → **Add Application Pool...**
   - **Name**: `SMPortalPool`
   - **.NET CLR version**: `No Managed Code` (ASP.NET Core runs out-of-process)
   - **Managed pipeline mode**: `Integrated`
   - **Start application pool immediately**: ✓ checked
   - Click **OK**

3. **Configure App Pool Identity**
   - Right-click **SMPortalPool** → **Advanced Settings...**
   - Under **Process Model**:
     - **Identity**: Click `...` button → Select **Custom account** → **Set...**
     - Username: `domain\svc_SMPortal`
     - Password: `ServiceAccountPassword123!@#`
     - Click **OK**
   - Under **Behavior**:
     - **Idle Time-out**: `00:30:00` (30 minutes)
     - **Max Processes**: `1`
   - Click **OK**

4. **Restart App Pool**
   - Right-click **SMPortalPool** → **Cycle** (or Stop/Start)

#### 2. Create Website (GUI)

1. **Add New Website**
   - Expand server node → Right-click **Sites** → **Add Website...**
   - **Site name**: `SM-Portal`
   - **Physical path**: `C:\InetPub\SM-Portal` (create directory first if not exists)
   - **Binding**:
     - Type: `https`
     - IP address: `All Unassigned`
     - Port: `443`
     - Host name: `sm-portal.company.local`
   - **SSL certificate**: (leave blank for now, will configure in next step)
   - **Application pool**: `SMPortalPool`
   - Click **OK**

2. **Add HTTP to HTTPS Redirect Website (Optional)**
   - Repeat above but create as `SM-Portal-HTTP`:
     - Type: `http`
     - Port: `80`
     - Host name: `sm-portal.company.local`
     - Application pool: `DefaultAppPool`

#### 3. Configure SSL/TLS Certificate (GUI)

1. **Import Certificate**
   - Open **Certificates** snap-in (certlm.msc)
   - Navigate to **Local Computer** → **Personal** → **Certificates**
   - Right-click **Certificates** → **Import...**
   - Select certificate file: `C:\Certs\sm-portal.company.local.pfx`
   - Enter password and ensure **Mark key as exportable** is checked
   - Complete the wizard

2. **Bind Certificate to Website**
   - In IIS Manager, click on **SM-Portal** website
   - In right panel under **Edit Site**, click **Bindings**
   - Select the HTTPS binding (port 443)
   - Click **Edit...**
   - **SSL certificate**: Select your certificate from dropdown
   - **SNI**: ✓ checked
   - Click **OK**

3. **Verify Binding**
   - Back in **Site Bindings**, you should see HTTPS binding with certificate thumbprint
   - Click **Close**

#### 4. Configure Authentication (GUI)

1. **Select SM-Portal Site** in IIS Manager
2. **In Features View, double-click Authentication**
   - You should see the IIS Features page with various authentication methods listed
3. **Enable Windows Authentication**
   - Look for **Windows Authentication** in the list
   - **Right-click** on it → Select **Enable**
   - Status will change from "Disabled" to "Enabled" (gray to white background)
   - Verify: Windows Authentication should now show as **Enabled**

4. **Disable Anonymous Authentication**
   - Look for **Anonymous Authentication** in the list
   - **Right-click** on it → Select **Disable**
   - Status will change to "Disabled" (grayed out)
   - Verify: Anonymous Authentication should now show as **Disabled**

5. **Verify Other Authentication Methods (Optional)**
   - **ASP.NET Impersonation**: Should be **Disabled** (grayed out)
   - **Forms Authentication**: Should be **Disabled** (grayed out)
   - **Digest Authentication**: Should be **Disabled** (grayed out)
   - Only **Windows Authentication** should be **Enabled**

6. **Machine Keys** (if needed for data encryption)
   - In Features View (same page), look for **Machine Keys**
   - Double-click it to view current machine key settings
   - Note the machine key for future reference or key rotation
   - Typically you don't need to modify this for basic setup

#### Detailed Visual Guide for Authentication

**Step-by-Step Screenshots (if needed):**
- After double-clicking "Authentication", you'll see a list like:
  ```
  [✓] Windows Authentication          [Enabled]
  [ ] Anonymous Authentication        [Disabled]
  [ ] ASP.NET Impersonation          [Disabled]
  [ ] Forms Authentication           [Disabled]
  [ ] Digest Authentication          [Disabled]
  ```
- If status doesn't immediately update, click back to the site and re-open Authentication
- On some IIS versions, you may need IIS to restart for changes to take effect

#### 5. Configure File Permissions (GUI)

1. **Navigate to** `C:\InetPub\SM-Portal` in Windows Explorer
2. **Right-click folder** → **Properties**
3. **Security tab** → **Edit...**
4. **Click Advanced**
5. **Change Permissions**:
   - Click **Add...**
   - **Object type**: Ensure "IIS AppPool" is shown, otherwise click **Locations** and add it
   - **Enter object name**: `IIS AppPool\SMPortalPool`
   - Click **Check Names** → should turn it underlined
   - Click **OK**
   - Select the new line and click **Edit...**
   - **Permissions**:
     - `List folder contents` - ✓
     - `Read` - ✓
     - `Read & Execute` - ✓
   - Click **OK** three times

#### 6. Add Application (if not already done)

1. **Select SM-Portal Site** in IIS Manager
2. **In the Site area, click SM-Portal (root)**
3. In the right panel, you should see it's already an application
4. **Right-click SM-Portal** → **Switch to Content View** (if needed)
5. No additional configuration needed for ASP.NET Core

#### 7. Enable HTTP/2 and Compression (GUI)

1. **Select SM-Portal Site**
2. **Double-click HTTP Response Headers** in Features View
3. **Compression** (if not already configured):
   - In right panel, right-click → **Open Feature**
   - Enable both **Static** and **Dynamic** compression
   - Click back to go to HTTP Response Headers
4. **Add Custom Headers** (Security):
   - Right panel → **Add...**
   - **Strict-Transport-Security**: `max-age=31536000; includeSubDomains`
   - **X-Content-Type-Options**: `nosniff`
   - **X-Frame-Options**: `DENY`

#### 8. Configure HTTPS Redirect (Web.config in GUI)

1. **Right-click SM-Portal** → **Explore**
2. **Create web.config** if it doesn't exist (see Application Deployment section)
3. Or use **URL Rewrite** feature:
   - Double-click **URL Rewrite**
   - **Add Rule** → **Blank rule**
   - **Pattern**: `.*`
   - **Action Type**: **Redirect**
   - **Redirect URL**: `https://{HTTP_HOST}{REQUEST_URI}`
   - **Append query string**: ✓ checked
   - Click **Apply** in right panel

#### 9. Test Configuration (GUI)

1. **Right-click SM-Portal Site** → **Browse**
   - This should open https://sm-portal.company.local in default browser
   - Certificate warning is expected if self-signed
   - Should see ASP.NET application or 500 error (expected before deployment)

2. **Check Application Pool Status**
   - **Application Pools** → **SMPortalPool**
   - Status should show **Started**
   - If not, right-click → **Start**

---

## Application Deployment

### 1. Prepare Deployment Directory

#### Option A: PowerShell

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

#### Option B: File Explorer GUI

1. **Open File Explorer** (`Win + E`)

2. **Navigate to INetPub**
   - Address bar: `C:\InetPub`

3. **Create/Backup Existing Directory**
   - If `SM-Portal` folder exists:
     - Right-click it → **Rename**
     - Rename to: `SM-Portal.backup.20260225-143000` (use current date/time)
   - If no folder exists, skip this step

4. **Create New SM-Portal Directory**
   - Right-click in empty space → **New** → **Folder**
   - Name it: `SM-Portal`

### 2. Copy Application Files

#### Option A: PowerShell

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

#### Option B: File Explorer GUI (Drag & Drop)

1. **Open Two File Explorer Windows**
   - Window 1: `C:\Deploy\SM-Portal-Release` (source)
   - Window 2: `C:\InetPub\SM-Portal` (destination)

2. **Copy Release Files**
   - In Window 1, select all files (`Ctrl + A`)
   - Drag & drop to Window 2, or:
   - Right-click → **Copy**, then in Window 2 → Right-click → **Paste**
   - Wait for copy to complete

3. **Copy Configuration Files**
   - Open File Explorer: `C:\Deploy\SM-Portal\src`
   - Copy `appsettings.Production.json`
   - Paste into `C:\InetPub\SM-Portal`

4. **Copy Config Directory**
   - Open File Explorer: `C:\Deploy\SM-Portal\config`
   - Copy entire `config` folder
   - Paste into `C:\InetPub\SM-Portal`

5. **Verify Files**
   - In File Explorer (`C:\InetPub\SM-Portal`), you should see:
     - `SM-Portal.dll`
     - `appsettings.json`
     - `appsettings.Production.json`
     - `web.config`
     - `config/` folder
     - Other runtime files

### 2.5 Copy Frontend Files (If Integrated Deployment)

**Option A: Integrated Deployment (Single URL)**

If you want both backend API and frontend served from the same IIS site:

#### PowerShell

```powershell
# Copy frontend dist to backend wwwroot folder
$frontendDist = "C:\Deploy\SM-Portal\frontend\dist"
$wwwroot = "C:\InetPub\SM-Portal\wwwroot"

# Create wwwroot if it doesn't exist
if (-not (Test-Path $wwwroot)) {
  New-Item -Path $wwwroot -ItemType Directory -Force | Out-Null
}

# Copy all frontend files
Copy-Item -Path "$frontendDist\*" -Destination $wwwroot -Recurse -Force

Write-Host "✓ Frontend files deployed to wwwroot"
Write-Host "  - API endpoint: https://sm-portal.company.local/api/"
Write-Host "  - Frontend URL: https://sm-portal.company.local/"
```

#### File Explorer GUI

1. **Open Two File Explorer Windows**
   - Window 1: `C:\Deploy\SM-Portal\frontend\dist`
   - Window 2: `C:\InetPub\SM-Portal`

2. **Create wwwroot Folder** (if it doesn't exist)
   - In Window 2, right-click → **New** → **Folder**
   - Name it: `wwwroot`

3. **Copy Frontend Files**
   - In Window 1, select all files (`Ctrl + A`)
   - Drag & drop to Window 2's `wwwroot` folder
   - Wait for copy to complete

4. **Verify Frontend Files in wwwroot**
   - In File Explorer: `C:\InetPub\SM-Portal\wwwroot`
   - Should contain:
     - `index.html`
     - `assets/` folder with .js and .css files

**Option B: Separate Deployment (Recommended for SPAs)**

If you want frontend served from CDN or separate static hosting:
- Skip this step
- Deploy `C:\Deploy\SM-Portal\frontend\dist` separately to:
  - Azure Static Web Apps
  - CloudFlare Pages
  - S3 + CloudFront
  - Separate nginx server
  - Or keep on development server for testing
- Update `VITE_API_URL` in frontend environment to point to backend API URL

---

### 3. Configure Web.config (Backend + Optional Frontend SPA Routing)

**Note:** ASP.NET Core uses appsettings.json, but you may need web.config for IIS configuration and SPA routing.

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

    <!-- SPA Routing - If serving React app from wwwroot -->
    <!-- Redirect 404s for SPA routes back to index.html -->
    <rewrite>
      <rules>
        <!-- Don't rewrite actual files/folders -->
        <rule name="React Router" stopProcessing="true">
          <match url="^(?!api/|assets/|\.js|\.css|\.html).*$" />
          <conditions>
            <!-- Don't process if it's a file or folder -->
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
            <!-- Don't rewrite API calls -->
            <add input="{REQUEST_URI}" pattern="^/api/" negate="true" />
          </conditions>
          <!-- Rewrite to index.html for SPA -->
          <action type="Rewrite" url="/index.html" />
        </rule>
      </rules>
    </rewrite>

    <!-- Security Headers -->
    <httpProtocol>
      <customHeaders>
        <add name="Strict-Transport-Security" value="max-age=31536000; includeSubDomains" />
        <add name="X-Content-Type-Options" value="nosniff" />
        <add name="X-Frame-Options" value="DENY" />
        <add name="X-XSS-Protection" value="1; mode=block" />
        <add name="Content-Security-Policy" value="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'" />
      </customHeaders>
    </httpProtocol>

    <!-- Compression -->
    <urlCompression doStaticCompression="true" 
                    doDynamicCompression="true" />

    <!-- Request Filtering & Static Content Cache -->
    <staticContent>
      <!-- Cache JavaScript for 1 year -->
      <clientCache cacheControlMode="UseMaxAge" cacheControlMaxAgeSeconds="31536000" 
                   setETag="true" />
    </staticContent>
    
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

**Key Additions for Frontend SPA:**
- **URL Rewrite Rule**: Routes unmatched requests (except `/api/`, `/assets/`, static files) back to `index.html` so React Router can handle navigation
- **Content-Security-Policy**: Updated to allow inline styles/scripts used by React
- **Static Content Caching**: Cache built assets for performance

---

### 4. Restart IIS and Verify Deployment

#### Option A: PowerShell

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

#### Option B: IIS Manager GUI

1. **Open IIS Manager** (`Win + R` → `inetmgr`)

2. **Restart Application Pool**
   - In left panel: **Application Pools** → Right-click **SMPortalPool**
   - Select **Cycle** (if running) or **Start** (if stopped)
   - Status should change to **Started** (green circle)

3. **Verify Website is Running**
   - In left panel: **Sites** → Right-click **SM-Portal**
   - Select **Browse *:443 (https)** 
   - This opens your browser to the website
   - You should see either:
     - Application homepage
     - 500 error (check logs for details)
     - Certificate warning (OK if self-signed, proceed anyway)

4. **View Worker Process**
   - In **Application Pools** → **SMPortalPool** is now listed
   - Right-click → **View Worker Processes**
   - Shows active w3wp.exe process for the pool
   - Indicates app pool is running

5. **Check IIS Logs**
   - Right-click **SM-Portal** → **Explore**
   - Navigate to: `C:\inetpub\logs\LogFiles\W3SVC*`
   - Open latest `.log` file with Notepad
   - Look for entries showing successful requests (status 200)
   - Any 500 errors will show error details

#### Option C: Services Manager GUI (Alternative Restart)

1. **Open Services Manager**
   - Press `Win + R`, type `services.msc`, press Enter

2. **Find IIS Services**
   - Look for: **World Wide Web Publishing Service**
   - Right-click → **Restart**
   - Status should change to **Running**

3. **Verify in IIS Manager**
   - Open IIS Manager again
   - All sites should be running

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

#### Option A: PowerShell

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

#### Option B: File Explorer & Notepad GUI

1. **Open File Explorer** (`Win + E`)

2. **Navigate to IIS Logs**
   - Address bar: `C:\inetpub\logs\LogFiles`
   - Look for folder: `W3SVC*` (W3SVC1, W3SVC2, etc.)
   - Open that folder

3. **View Latest Log**
   - Files are named: `u_YYMMDD_HHMMSS_*.log`
   - Right-click the latest log file (highest number/date)
   - Select **Open with** → **Notepad** (or your editor)

4. **Search for Errors**
   - In Notepad, press `Ctrl + F` to find
   - Search for: `500` (server error), `401` (auth error), `403` (forbidden)
   - Review any errors found

#### Option C: IIS Manager GUI - Real-Time Logs

1. **Open IIS Manager** (`Win + R` → `inetmgr`)

2. **View Live Logs**
   - Click on **SM-Portal** website
   - Double-click **Logging** in Features View
   - In right panel, click **View Log Files...**
   - Opens File Explorer showing live log files
   - Select latest log → click **Open** with Notepad

### 7. Event Viewer Errors

#### Option A: PowerShell

```powershell
# Check Application event log
Get-EventLog -LogName "Application" -EntryType "Error" -Newest 20 |
  Where-Object { $_.Source -like "*SM*" -or $_.Source -like "*ASP*" } |
  Format-List TimeGenerated, Source, Message
```

#### Option B: Event Viewer GUI

1. **Open Event Viewer**
   - Press `Win + R`, type `eventvwr.msc`, press Enter
   - Or: Server Manager → Tools → Event Viewer

2. **Navigate to Application Logs**
   - In left panel: **Windows Logs** → **Application**
   - Wait for logs to load

3. **Filter for Relevant Errors**
   - Right-click the list → **Filter Current Log...**
   - **Event level**: Check ☑ **Error** and ☑ **Warning**
   - **Event source**: Type `ASP.NET` or `W3SVC` or your application name
   - Click **OK**

4. **Review Errors**
   - Errors are listed in reverse chronological order (newest first)
   - Double-click an error to see full details
   - Common errors:
     - **ASP.NET Core Module**: Missing .NET Runtime or configuration
     - **Kestrel**: Application server errors
     - **IIS**: Web server configuration issues

5. **Clear Log (if needed)**
   - Right-click **Application** → **Clear Log**
   - This helps isolate new errors from old ones

### 8. Performance Monitoring

#### Option A: PowerShell

```powershell
# Monitor app pool CPU and memory
Get-Process -Name "w3wp" | 
  Select-Object Name, Id, CPU, PM, VM

# Get app pool handle count
Get-Process -Name "w3wp" | 
  Select-Object Name, Id, Handles, PagedMemorySize
```

#### Option B: Task Manager GUI

1. **Open Task Manager**
   - Press `Ctrl + Shift + Esc` or `Ctrl + Alt + Delete` → **Task Manager**

2. **Find IIS Worker Process**
   - Click **Details** tab
   - Look for process: `w3wp.exe` (may be multiple if several app pools running)
   - If not visible, click **Show processes from all users**

3. **Monitor Performance**
   - **CPU**: Shows CPU percentage used by process
   - **Memory**: Shows RAM (Private Working Set)
   - **Handles**: Right-click process → **Properties** to see details
   - Watch these values:
     - Normal CPU: <20%
     - Normal Memory: <500MB
     - If exceeding, may indicate memory leak or high traffic

4. **Monitor Network (Optional)**
   - Click **Performance** tab
   - Shows real-time CPU, memory, disk, network usage
   - Network graph shows data transfer in/out

#### Option C: Performance Monitor (Advanced)

1. **Open Performance Monitor**
   - Press `Win + R`, type `perfmon`, press Enter
   - Or: Server Manager → Tools → Performance Monitor

2. **Add Performance Counter**
   - In left panel: **Monitoring Tools** → **Performance Monitor**
   - In right panel, click **Add button** (or press Ctrl + I)
   - Click **Add...**

3. **Select Performance Counters**
   - **Available counters on computer**: Select your server
   - Expand categories:
     - **Processor**: CPU usage
     - **Memory**: RAM usage
     - **Process**: w3wp process details
     - **Web Service**: IIS-specific metrics
   - Select desired counters
   - Click **Add >>**
   - Click **OK**

4. **View Real-Time Graph**
   - Graph displays counters in real-time
   - Legend shows latest value, average, minimum, maximum
   - Right-click to adjust view (line graph, histogram, report)

5. **Alert on Thresholds (Optional)**
   - In left panel: **Alerts and Logs** → **Alerts**
   - Right-click → **New Alert Settings**
   - Set threshold values
   - Click **Add counters**
   - Similar to above - add performance counters
   - Set trigger value (e.g., CPU > 80%)
   - Click **OK**

#### Option D: Resource Monitor GUI

1. **Open Resource Monitor**
   - Press `Win + R`, type `resmon`, press Enter
   - Or: Task Manager → **Performance** tab → **Open Resource Monitor**

2. **Monitor CPU Tab**
   - Shows processes using CPU (sorted by usage)
   - Find `w3wp.exe`
   - View CPU percentage, threads, handles

3. **Monitor Memory Tab**
   - Shows memory usage by process
   - Find `w3wp.exe`
   - View In Use memory, Committed memory

4. **Monitor Network Tab**
   - Shows network connections by process
   - Find `w3wp.exe`
   - View sent/received bytes, TCP connections

5. **Monitor Disk Tab**
   - Shows disk I/O by process
   - Find `w3wp.exe` if there are disk performance concerns

---

## Troubleshooting

### Issue: 500 Internal Server Error

#### Diagnosis via PowerShell:

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

#### Diagnosis via GUI:

1. **Check IIS Logs** (File Explorer method)
   - See IIS Logs Review section above
   - Look for HTTP status codes: `500`
   - Review error messages in log entries

2. **Check Event Viewer**
   - See Event Viewer Errors section above
   - Filter for errors in Application log
   - Look for source: `ASP.NET Core Module` or `W3SVC`

3. **Check IIS Manager**
   - Open IIS Manager (`inetmgr`)
   - Check **SMPortalPool** status (should be "Started")
   - If stopped, right-click → **Start**
    
4. **Enable Detailed Error Pages**
   - In IIS Manager: **SM-Portal** → Double-click **Error Pages**
   - In right panel: **Edit Feature Settings...**
   - Select **Detailed errors**
   - Click **OK**
   - Reload website in browser to see detailed error

#### Solutions:

- Verify appsettings.json syntax using online JSON validator
- Ensure connection string is correct in appsettings.json
- Check file permissions on deployment directory (see File Permissions section)
- Verify .NET 8.0 Hosting Bundle is installed (see Prerequisites)
- Restart app pool: In IIS Manager, right-click **SMPortalPool** → **Cycle**

---

### Issue: 401 Unauthorized (Authentication Failed)

#### Diagnosis via PowerShell:

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

#### Diagnosis via GUI:

1. **Verify Windows Authentication is Enabled**
   - In IIS Manager: **SM-Portal** → Double-click **Authentication**
   - Verify status shows:
     - **Windows Authentication**: **Enabled** (white background)
     - **Anonymous Authentication**: **Disabled** (grayed out)
   - If not, right-click **Windows Authentication** → **Enable**

2. **Test AD Connectivity**
   - Press `Win + R`, type `adsiedit.msc`
   - This opens Active Directory editing tool
   - If it opens without error, AD connectivity is working
   - Should show your domain structure

3. **Check User's AD Group Membership**
   - Press `Win + R`, type `control.exe`
   - Click **User Accounts**
   - Click **Change Password** or **Manage another account**
   - Select your user → **Properties**
   - Note: For full group details, you need **Active Directory Users and Computers** (see Domain Admin)

4. **Check Credentials via Network Connections**
   - Press `Win + R`, type `CredentialManager`
   - View stored credentials
   - Verify Windows domain credentials are correct

#### Solutions:

- Enable Windows Authentication in web.config (see Configuration section)
- Disable Anonymous Authentication in IIS Manager
- Ensure appsettings.json has correct domain name
- Verify AD groups exist and user is member (Domain Admin access required)
- Check Kerberos configuration if using domain authentication
- Test with different user account to isolate issue

---

### Issue: Cannot Connect to SQL Server

#### Diagnosis via PowerShell:

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

#### Diagnosis via GUI:

1. **Test Network Connection to SQL Server**
   - Press `Win + R`, type `cmd.exe`
   - Run: `ping SQL-SERVER` (replace with actual server name)
   - Should show IP address and response times
   - If "Request timed out", network is blocking

2. **Check SQL Server Service via Services Manager**
   - Press `Win + R`, type `services.msc`
   - Find: **SQL Server (INSTANCE_NAME)**
   - Status should show **Running**
   - If stopped, right-click → **Start**

3. **Check SQL Server Configuration Manager**
   - Press `Win + R`, type `SQLServerManager15.msc` (or 16/17 depending on version)
   - Expand **SQL Server Network Configuration** → **Protocols for [Instance]**
   - Verify **TCP/IP** is **Enabled**
   - Right-click it → **Properties** → Ensure port is 1433 (or your custom port)

4. **View SQL Server Error Log**
   - Open SQL Server Management Studio (if available)
   - Connect to SQL Server
   - View → **Error Log**
   - Check for recent errors

#### Solutions:

- Verify SQL Server is running (see Services Manager above)
- Check connection string in appsettings.json for typos
- Ensure SQL login exists: Contact DBA or check via SQL Server Management Studio
- Verify firewall allows port 1433 (or custom port) - Test-NetConnection shows open/closed
- Check SQL Server TCP/IP is enabled in SQL Server Configuration Manager
- Verify network connectivity with `ping` command

---

### Issue: Certificate Validation Errors

#### Diagnosis via PowerShell:

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

#### Diagnosis via GUI:

1. **View Certificate Details in Certificates Manager**
   - Press `Win + R`, type `certlm.msc`
   - Navigate to **Certificates - Local Computer** → **Personal** → **Certificates**
   - Right-click your SM-Portal certificate → **Open**
   - Verify:
     - **Subject CN**: Should match `sm-portal.company.local`
     - **Valid from**: Current date should be after this
     - **Valid to**: Should be in the future (check expiration!)
     - **Issuer**: Should match your CA

2. **Check Certificate Binding in IIS Manager**
   - In IIS Manager: **SM-Portal** → In right panel click **Bindings**
   - Select HTTPS binding (port 443)
   - Verify **SSL certificate** shows your certificate thumbprint
   - If blank or incorrect, see "Configure SSL/TLS Certificate" section

3. **Test HTTPS in Browser**
   - Open browser → Navigate to `https://sm-portal.company.local`
   - If certificate warning appears:
     - **Self-signed**: Click "Advanced" → "Proceed anyway" (OK for testing)
     - **Expired**: Certificate needs renewal
     - **CN mismatch**: Certificate CN doesn't match hostname
     - **Untrusted CA**: Import CA root certificate to browser

4. **Import Certificate to Trusted Root (if needed)**
   - Right-click certificate in Certificates Manager
   - Select **Copy**
   - Navigate to **Trust Root Certification Authorities** → Right-click → **Paste**
   - Or follow your org's certificate deployment process

#### Solutions:

- Renew expired certificate before deployment
- Ensure certificate CN matches hostname exactly (`sm-portal.company.local`)
- Import certificate to Trusted Root store for all client machines
- Verify certificate is in Personal store (Cert:\LocalMachine\My)
- Re-bind certificate in IIS if binding shows wrong thumbprint
- Check certificate format (PFX/PKCS12 required for import)

### Issue: App Pool Crashes on Startup

#### Diagnosis via PowerShell:

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

#### Diagnosis via GUI:

1. **Check App Pool Status in IIS Manager**
   - Open IIS Manager (`inetmgr`)
   - **Application Pools** → Find **SMPortalPool**
   - Status should show **Started**
   - If shows **Stopped**, it crashed
   - Right-click → **View Worker Processes**
   - If empty list, app pool is not running

2. **View Event Log for Crash Details**
   - Press `Win + R`, type `eventvwr.msc`
   - **Windows Logs** → **Application**
   - Filter for errors (see Event Viewer section above)
   - Look for source: **.NET Runtime** or **ASP.NET Core Module**
   - Double-click errors to view full stack trace

3. **Enable Detailed Errors**
   - In IIS Manager: **SM-Portal** → Double-click **Error Pages**
   - In right panel: **Edit Feature Settings...**
   - Select **Detailed errors**
   - Click **OK**
   - Reload website in browser

4. **Check Deployment Directory for Application Files**
   - Open File Explorer: `C:\InetPub\SM-Portal`
   - Verify these files exist:
     - `SM-Portal.dll`
     - `SM-Portal.runtimeconfig.json`
     - `appsettings.json`
   - If missing, redeploy (see Application Deployment section)

5. **Verify File Permissions**
   - Right-click `C:\InetPub\SM-Portal` → **Properties** → **Security**
   - Click **Edit** → Select `IIS AppPool\SMPortalPool`
   - Verify permissions include **Read** and **Read & Execute**
   - If missing, see File Permissions section

#### Solutions:

- Check appsettings.json for JSON syntax errors (use online validator)
- Verify all required files are in deployment directory
- Verify .NET 8.0 Hosting Bundle is installed (go to Control Panel → Programs → Programs and Features, search for "hosting")
- Review Event Viewer errors for specific error messages
- Enable stdout logging in web.config to debug startup issues (see Enable Diagnostic Logging section below)
- Check connection string accessibility (verify SQL Server is running)
- Validate all configuration values match environment (API endpoints, domain names, etc.)

### Enable Diagnostic Logging

#### Option A: Modify web.config

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

#### Option B: Enable Logging via IIS Manager GUI

1. **Open IIS Manager** (`Win + R` → `inetmgr`)

2. **Enable Failed Request Tracing**
   - Select **SM-Portal** website
   - Double-click **Failed Request Tracing Rules**
   - In right panel, click **Add...**
   - **Trace path**: `*` (all paths)
   - **Trace status codes**: `400-599` (client and server errors)
   - Click **Next**
   - Select providers to trace (check **WWW Server, ASP.NET, ASPNET Events**)
   - Click **Finish**

3. **Configure Logging Properties**
   - Select **SM-Portal** website
   - Double-click **Logging**
   - Verify:
     - **Format**: `W3C`
     - **Directory**: `C:\inetpub\logs\LogFiles`
     - **Log File Rollover**: `Daily` or `Hourly`
   - Click **Apply**

4. **Enable Detailed HTTP Errors**
   - Select **SM-Portal** website
   - Double-click **Error Pages**
   - In right panel: **Edit Feature Settings...**
   - Select **Detailed errors**
   - Click **OK**

5. **View Failed Request Logs**
   - After making requests that fail, navigate to:
     - `C:\inetpub\logs\FailedReqLogFiles\W3SVC*`
   - Open the `.xml` file in browser or notepad
   - Shows detailed request/response information

#### Option C: View Application Logs via File Explorer

1. **Open File Explorer** (`Win + E`)

2. **Navigate to Logs Directory**
   - `C:\InetPub\SM-Portal\logs`

3. **View stdout Logs**
   - Files named: `stdout_*.log`
   - Right-click latest file → **Open with** → **Notepad**
   - Shows application startup messages and errors

4. **Monitor Logs in Real-Time**
   - Open Command Prompt in admin mode
   - Run: `Get-Content C:\InetPub\SM-Portal\logs\stdout_*.log -Wait`
   - This shows new log entries as they're written

#### Option D: Application Insights / Log Aggregation (if configured)

If your application logs to Azure Application Insights or similar:

1. **Open Azure Portal**
   - Navigate to your Application Insights resource
   - Click **Logs** (Kusto Query Language editor)
   - Query: `traces | where severity == "error" | order by timestamp desc | take 20`

2. **View in Management Portal**
   - Search for application name in logging platform
   - Filter by date range
   - Review errors and warnings

---

## GUI-Based Troubleshooting Dashboard

Use this section to quickly open multiple troubleshooting tools side-by-side for comprehensive diagnostics.

### Quick Troubleshooting Checklist (GUI Tools)

| Tool | Purpose | Launch Command | Location |
|------|---------|-----------------|----------|
| IIS Manager | Site/pool status, logs, config | `inetmgr` | Primary tool |
| Event Viewer | Application errors, warnings | `eventvwr.msc` | Windows Admin Tools |
| Services Manager | IIS service status | `services.msc` | Windows Admin Tools |
| Task Manager | CPU/Memory monitoring | `taskmgr` or `Ctrl+Shift+Esc` | Built-in utility |
| Performance Monitor | Real-time metrics | `perfmon` | Windows Admin Tools |
| Resource Monitor | Process-level resource usage | `resmon` | Windows Admin Tools |
| Certificates Manager | SSL certificate verification | `certlm.msc` | Windows Admin Tools |
| Certificate Authority | Check cert validity | `certmgr.msc` | Built-in utility |
| File Explorer | Verify file deployment | `explorer` or `Win+E` | Built-in utility |
| Notepad | View log files | `notepad` | Built-in utility |
| SQL Server Mgmt Studio | Database connectivity verification | Search Windows | Optional tool |
| Active Directory Users & Computers | User/group verification | `dsa.msc` | Domain Admin only |

### One-Stop Troubleshooting Session

**To diagnose a deployment issue quickly:**

1. **Open 4 windows in Windows**
   - **Window 1**: IIS Manager (`inetmgr`)
   - **Window 2**: Event Viewer (`eventvwr.msc`) → Application log filtered for errors
   - **Window 3**: File Explorer (`explorer C:\inetpub\logs\LogFiles`)
   - **Window 4**: File Explorer (`explorer C:\InetPub\SM-Portal`)

2. **In Window 1 (IIS Manager)**
   - Check **SM-Portal** site status: Should be **Running** (green)
   - Check **SMPortalPool** status: Should be **Started** (green)
   - If not, right-click → **Start**
   - Double-click **Logging** to verify logging is enabled
   - Note the log file directory

3. **In Window 2 (Event Viewer)**
   - Filter for errors in past 30 minutes
   - Look for sources: `ASP.NET Core Module`, `W3SVC`, `IIS`
   - Read error messages for specific issues
   - Double-click error to see full stack trace

4. **In Window 3 (IIS Logs)**
   - Open latest `.log` file with Notepad
   - Scroll to end to see recent requests
   - Search for `500`, `401`, `403` status codes
   - Review the line before error for what triggered it

5. **In Window 4 (Deployment Directory)**
   - Verify key files exist:
     - `SM-Portal.dll` ✓
     - `appsettings.json` ✓
     - `web.config` ✓
     - `config/` folder ✓
   - File dates should be recent (today or deployment date)
   - If old timestamps, re-deploy files

6. **Additional Checks**
   - **Browser test**: Open `https://sm-portal.company.local` in browser
     - Check certificate (ignore SSL warning if self-signed)
     - Look for application response or specific error message
   - **Task Manager** (`Ctrl+Shift+Esc`):
     - Find `w3wp.exe` process for SMPortalPool
     - Check CPU usage (should be <20% at idle)
     - Check Memory usage (should be <500MB normally)
     - If high, may indicate memory leak or high traffic

### GUI Tool Usage Summary

**Most Common Troubleshooting Scenarios:**

**Scenario 1: Website shows 500 error**
- Tools needed: IIS Manager, Event Viewer, Notepad (for logs)
- Steps: Check IIS Manager status → Review Event Viewer errors → Check IIS logs for details

**Scenario 2: Users can't log in (401 errors)**
- Tools needed: IIS Manager, Active Directory Users & Computers, Event Viewer
- Steps: Check Windows Auth enabled in IIS → Verify user is in AD → Check AD connectivity in Event log

**Scenario 3: Slow performance**
- Tools needed: Task Manager, Performance Monitor, Resource Monitor
- Steps: Monitor w3wp.exe process in Task Manager → Open Performance Monitor for detailed metrics → Check disk I/O in Resource Monitor

**Scenario 4: Can't connect after deployment**
- Tools needed: File Explorer (verify files), IIS Manager (verify config), Services (verify IIS running)
- Steps: Check files deployed in File Explorer → Verify site status in IIS Manager → Restart IIS service if needed

**Scenario 5: Certificate errors in browser**
- Tools needed: Certificates Manager (certlm.msc), IIS Manager
- Steps: View certificate details in Certificates Manager → Verify expiration date → Verify binding in IIS Manager → Check CN matches hostname

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

## 📋 Complete Deployment Summary (Backend + Frontend)

### Quick Reference: Full Deployment Steps

Follow these steps **in order** for a complete SM-Portal deployment:

#### Phase 1: Code & Prep (30 min)
1. Clone/update repository from git
2. Configure appsettings.Production.json
3. Set up connection strings (User Secrets or Environment variables)

#### Phase 2: Build Backend (.NET) (15 min)
```powershell
cd C:\Deploy\SM-Portal\src
dotnet restore
dotnet test --configuration Release
dotnet publish -c Release -o C:\Deploy\SM-Portal-Release
```

#### Phase 3: Build Frontend (React/Vite) (10-15 min including npm install)
```powershell
cd C:\Deploy\SM-Portal\frontend
npm install
npm run build
# Creates: C:\Deploy\SM-Portal\frontend\dist
```

#### Phase 4: Prepare IIS (10 min via GUI)
1. Create App Pool: SMPortalPool
2. Create Website: SM-Portal (HTTPS on port 443)
3. Import and bind SSL certificate
4. Configure authentication (Windows Auth)
5. Set file permissions for app pool

#### Phase 5: Deploy to IIS (10 min)
1. Prepare deployment directory: `C:\InetPub\SM-Portal`
2. Copy backend files: `C:\Deploy\SM-Portal-Release\*` → `C:\InetPub\SM-Portal`
3. Copy frontend files (if integrated): `C:\Deploy\SM-Portal\frontend\dist\*` → `C:\InetPub\SM-Portal\wwwroot`
4. Copy config files and appsettings
5. Deploy web.config with proper handlers and SPA routing

#### Phase 6: Verify & Test (15 min)
1. Restart IIS app pool
2. Check HTTP status codes (200, 401, 404 as expected)
3. Test API endpoints: `/api/health`
4. Test frontend: `https://sm-portal.company.local/` (should show React app)
5. Test authentication: Login with Windows credentials
6. Check Event Viewer and IIS logs for errors

**Total Time: 90-120 minutes (60 min on subsequent deployments)**

---

### Deployment Architectures

**Option 1: Integrated (Recommended for testing/small deployments)**
```
IIS (Single Site)
├── /api/*                    → Backend .NET API
├── /index.html               → React app (from wwwroot)
├── /assets/*                 → React CSS/JS
└── /* (404s route to /)      → SPA routing
```
- Single URL: `https://sm-portal.company.local`
- Backend files: `C:\InetPub\SM-Portal\`
- Frontend files: `C:\InetPub\SM-Portal\wwwroot\`

**Option 2: Separate Sites (Most scalable)**
```
IIS Site 1: Backend API                    IIS Site 2: Frontend SPA (or CDN)
├── https://api.company.local/api/*        ├── https://sm-portal.company.local/
└── Backend .NET only                      └── React app (from CDN, S3, etc.)
```
- Backend URL: `https://api.company.local/api/`
- Frontend URL: `https://sm-portal.company.local/`
- CORS: Backend must allow frontend origin
- Frontend env var: `VITE_API_URL=https://api.company.local`

**Option 3: Load Balanced**
```
Load Balancer (Round-robin)
├── Server 1: Backend .NET + wwwroot Frontend
├── Server 2: Backend .NET + wwwroot Frontend
└── Server 3: Backend .NET + wwwroot Frontend
```
- Connection string: Points to shared SQL Server
- Frontend dist: Copied to all servers identically
- Health check: `/api/health`

---

### Troubleshooting Quick Links

| Issue | Section | Min to Fix |
|-------|---------|-----------|
| 500 error on startup | [App Pool Crashes](#issue-app-pool-crashes-on-startup) | 5-10 |
| 401 Unauthorized | [Authentication Failed](#issue-401-unauthorized-authentication-failed) | 10-15 |
| React app not found (404 on /) | [Web.config SPA Routing](#3-configure-webconfig-backend--optional-frontend-spa-routing) | 5 |
| Cannot connect to SQL | [Can't Connect to SQL Server](#issue-cannot-connect-to-sql-server) | 15-20 |
| Certificate error in browser | [Certificate Issues](#issue-certificate-validation-errors) | 10 |
| Frontend blank/broken styles | [Rebuild Frontend](#phase-3-build-frontend-reactvite) | 5-10 |
| npm install fails | [Frontend Troubleshooting](#frontend-build-troubleshooting) | 10-15 |

---

## Pre-Deployment Handoff Checklist

Before handing off to production, ensure:

- [ ] **Backend Build**
  - [ ] `dotnet test` passes with ≥80% coverage
  - [ ] `dotnet publish` succeeds with no errors
  - [ ] All required DLLs in C:\Deploy\SM-Portal-Release\
  - [ ] appsettings files copied

- [ ] **Frontend Build**
  - [ ] `npm install` completes without warnings
  - [ ] `npm run build` succeeds with no errors
  - [ ] dist/ folder created with index.html and assets/
  - [ ] .js and .css files are minified (smaller file sizes)

- [ ] **IIS Configuration**
  - [ ] App pool created with correct identity and settings
  - [ ] Website created with correct bindings
  - [ ] SSL certificate imported and bound
  - [ ] Windows Authentication enabled, Anonymous disabled
  - [ ] File permissions set for app pool user

- [ ] **Deployment**
  - [ ] Deployment tested in staging environment
  - [ ] All post-deployment tests pass (API & frontend loads)
  - [ ] Database backups created
  - [ ] Connection strings verified (not hardcoded)
  - [ ] No credentials or secrets in source code or logs

- [ ] **Frontend Specific**
  - [ ] React app loads at https://sm-portal.company.local/
  - [ ] React routing works (navigate between pages)
  - [ ] CSS/styling displays correctly
  - [ ] Console has no JavaScript errors
  - [ ] API calls succeed from frontend to backend

- [ ] **Rollback**
  - [ ] Rollback plan tested
  - [ ] Previous version backed up
  - [ ] Backup location documented

- [ ] **Documentation**
  - [ ] Deployment steps documented for next person
  - [ ] Environment-specific values recorded (server names, ports, domains)
  - [ ] Known issues and workarounds documented
  - [ ] Post-mortem scheduled if any issues occurred

- [ ] **Monitoring**
  - [ ] Performance baseline established (response times, memory usage)
  - [ ] Alerting configured for errors/slowness
  - [ ] Log aggregation working (Event Viewer, IIS logs accessible)

- [ ] **Communication**
  - [ ] Stakeholders notified of deployment
  - [ ] Support team trained on new application
  - [ ] Users informed of new feature availability

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

