<#
.SYNOPSIS
    Creates and secures the SM-Portal secrets file on the IIS server.

.DESCRIPTION
    Same pattern as Reporting-Service\scripts\Setup-ServerSecrets.ps1.
    Stores API keys for downstream services (MyInvois, Reporting) outside the
    deployment folder in a NTFS-protected JSON file.

.PARAMETER AppPoolName
    IIS application pool name. Default: SMPortalPool

.PARAMETER SecretsPath
    Full path where secrets.json will be created.
    Default: C:\ProgramData\SRX\SM-Portal\secrets.json

.EXAMPLE
    .\Setup-ServerSecrets.ps1
    .\Setup-ServerSecrets.ps1 -AppPoolName "SMPortalPool"

.NOTES
    Run as Administrator on SRXWEBAPP1.
    Required before first production deployment.
#>
[CmdletBinding()]
param(
    [string]$AppPoolName = "SMPortalPool",
    [string]$SecretsPath = "C:\ProgramData\SRX\SM-Portal\secrets.json"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ── Require admin ──────────────────────────────────────────────────────────────
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
        [Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Error "This script must be run as Administrator."
    exit 1
}

Write-Host ""
Write-Host "=== SM-Portal — Server Secrets Setup ===" -ForegroundColor Cyan
Write-Host "Secrets file: $SecretsPath"
Write-Host "App pool:     $AppPoolName"
Write-Host ""

# ── 1. Create directory ────────────────────────────────────────────────────────
$dir = Split-Path $SecretsPath -Parent
if (-not (Test-Path $dir)) {
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
    Write-Host "[OK] Created directory: $dir" -ForegroundColor Green
} else {
    Write-Host "[OK] Directory exists:  $dir" -ForegroundColor DarkGreen
}

# ── 2. Prompt for secrets ──────────────────────────────────────────────────────
Write-Host ""
Write-Host "Enter the secrets for this environment." -ForegroundColor Yellow
Write-Host "Values are masked. Press Enter to keep existing value (if file already exists)."
Write-Host ""

function ConvertFrom-SecureStringToPlain([Security.SecureString]$secure) {
    if (-not $secure) { return "" }
    $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try {
        return [Runtime.InteropServices.Marshal]::PtrToStringUni($ptr)
    } finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
    }
}

function Read-SecretValue([string]$Prompt, [string]$ExistingValue = "") {
    $masked = if ($ExistingValue) { " [currently set — Enter to keep]" } else { " [required]" }
    $secureInput = Read-Host "$Prompt$masked" -AsSecureString
    $input = ConvertFrom-SecureStringToPlain $secureInput
    if ([string]::IsNullOrWhiteSpace($input)) { return $ExistingValue }
    return $input.Trim()
}

$existing = @{ MyInvoisApi = @{ ApiKey = "" }; ReportingApi = @{ BaseUrl = ""; ApiKey = "" } }
if (Test-Path $SecretsPath) {
    try {
        $existing = Get-Content $SecretsPath | ConvertFrom-Json -AsHashtable
        Write-Host "[INFO] Existing secrets file found — will update." -ForegroundColor DarkYellow
    } catch {
        Write-Host "[WARN] Could not parse existing file — will overwrite." -ForegroundColor Yellow
    }
}

$myInvoisApiKey   = Read-SecretValue "MyInvoisApi:ApiKey   (MyInvois-Service primary key)" `
    ($existing.MyInvoisApi?.ApiKey ??   "")
$reportingBaseUrl = Read-SecretValue "ReportingApi:BaseUrl (e.g. http://srxwebapp1/reporting/)" `
    ($existing.ReportingApi?.BaseUrl ?? "")
$reportingApiKey  = Read-SecretValue "ReportingApi:ApiKey  (Reporting-Service primary key)" `
    ($existing.ReportingApi?.ApiKey ?? "")

$missing = @()
if (-not $myInvoisApiKey)   { $missing += "MyInvoisApi:ApiKey" }
if (-not $reportingBaseUrl) { $missing += "ReportingApi:BaseUrl" }
if (-not $reportingApiKey)  { $missing += "ReportingApi:ApiKey" }

if ($missing.Count -gt 0) {
    Write-Error "Missing required secrets: $($missing -join ', '). Cannot continue."
    exit 1
}

# ── 3. Write secrets file ──────────────────────────────────────────────────────
$secrets = [ordered]@{
    MyInvoisApi = [ordered]@{ ApiKey  = $myInvoisApiKey }
    ReportingApi = [ordered]@{
        BaseUrl = $reportingBaseUrl
        ApiKey  = $reportingApiKey
    }
}

$secrets | ConvertTo-Json -Depth 5 | Set-Content -Path $SecretsPath -Encoding UTF8 -Force
Write-Host "[OK] Secrets file written: $SecretsPath" -ForegroundColor Green

# ── 4. Set NTFS ACLs ──────────────────────────────────────────────────────────
Write-Host ""
Write-Host "Applying NTFS ACLs..." -ForegroundColor Cyan

$acl = New-Object System.Security.AccessControl.FileSecurity
$acl.SetAccessRuleProtection($true, $false)

foreach ($account in @("Administrators", "SYSTEM")) {
    $acl.AddAccessRule((New-Object System.Security.AccessControl.FileSystemAccessRule(
        $account,
        [System.Security.AccessControl.FileSystemRights]::FullControl,
        [System.Security.AccessControl.InheritanceFlags]::None,
        [System.Security.AccessControl.PropagationFlags]::None,
        [System.Security.AccessControl.AccessControlType]::Allow)))
}

try {
    $poolIdentity = "IIS AppPool\$AppPoolName"
    $acl.AddAccessRule((New-Object System.Security.AccessControl.FileSystemAccessRule(
        $poolIdentity,
        [System.Security.AccessControl.FileSystemRights]::Read,
        [System.Security.AccessControl.InheritanceFlags]::None,
        [System.Security.AccessControl.PropagationFlags]::None,
        [System.Security.AccessControl.AccessControlType]::Allow)))
    Write-Host "[OK] Read access granted to: $poolIdentity" -ForegroundColor Green
} catch {
    Write-Warning "Could not add ACL for app pool — add Read permission manually."
}

Set-Acl -Path $SecretsPath -AclObject $acl
Write-Host "[OK] ACLs applied. Inheritance disabled." -ForegroundColor Green

# ── 5. Verify ─────────────────────────────────────────────────────────────────
$verifyAcl = Get-Acl $SecretsPath
Write-Host ""
Write-Host "Effective permissions on $SecretsPath :"
$verifyAcl.Access | Format-Table IdentityReference, FileSystemRights, AccessControlType -AutoSize

# ── 6. Summary ────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "=== Setup Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Secrets stored at: $SecretsPath"
Write-Host ""
Write-Host "Keys configured:"
Write-Host "  MyInvoisApi:ApiKey           [set]"
Write-Host "  ReportingApi:BaseUrl         [set]"
Write-Host "  ReportingApi:ApiKey          [set]"
Write-Host ""
Write-Host "The SM-Portal .NET backend will load this file at startup." -ForegroundColor Yellow
Write-Host "NOTE: SMPORTAL_SECRETS_PATH is already configured in src\web.config." -ForegroundColor DarkGreen
Write-Host "      Default path matches: $SecretsPath" -ForegroundColor DarkGreen
