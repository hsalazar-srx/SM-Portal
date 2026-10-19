# Running the Reports module locally

How to run SM-Portal and Reporting-Service on a laptop so the **Reports** tile opens, and what to check
when it does not. Written from the first real local run (2026-10-15), where it took several attempts
to find that the *order* things start in matters.

Related: [README → Reports access](../README.md#reports-access-reporting_read) ·
[Reporting-Service setup](../../Reporting-Service/docs/SETUP.md)

---

## The start order

| # | Step | Command | Listens on |
|---|---|---|---|
| 1 | **Connect the VPN** (or be on the corporate network) and confirm the domain is reachable | `nltest /dsgetdc:srxglobal.com` — must name a domain controller | — |
| 2 | Start the **frontend** | `cd C:\Projects\SM-Portal\frontend; npm run dev` | `http://localhost:5173` |
| 3 | Start the **backend portal** | `cd C:\Projects\SM-Portal; dotnet run --project .\src\MovexPortal.csproj` | `http://localhost:5050` |
| 4 | Start **Reporting-Service**, with the rate sync **off** | `cd C:\Projects\Reporting-Service; $env:ExchangeRateSync__Enabled='false'; dotnet run --project src/Reporting.Api --launch-profile http` | `http://localhost:5160` |
| 5 | Open the portal → **Reports** | `http://localhost:5173`, or check `http://localhost:5050/api/reports/access` → `{"allowed":true}` | — |

> **Never start Reporting-Service without `ExchangeRateSync__Enabled=false` on a laptop.** It connects to
> the live IBM i, and its startup sync **inserts exchange rates into the live MOVEX `CCURRA` table**.

### Which parts of that order are real requirements

This sequence is the one verified to work. Only the first two rules below are hard requirements; the
frontend can start at any point.

| Rule | Why | If broken |
|---|---|---|
| The **domain must be reachable before the backend portal starts** | The portal turns AD group names into SIDs **once, at startup** | Reports is denied for everyone, and stays denied **until the portal is restarted** |
| **Reporting-Service must be running before you open Reports** (or reload the page after it starts) | The tile and the report list come from the catalog Reporting-Service returns; the Welcome page asks only once, on load | Tile disabled, empty list, or a 502 until Reporting-Service is up and the page is reloaded |
| Frontend: any time | It does not talk to AD or Reporting-Service directly | — |

**Restart the backend portal after any of these:** you change `config/rbac-config.json`; you change the
`ReportingApi:ApiKey` secret (secrets are read at startup); the VPN or network changed after the portal
started.

---

## One-off prerequisites

1. **API keys match.** The portal's `ReportingApi:ApiKey` must equal Reporting-Service's `ApiKeys:Primary`.
   Copy it without printing it:
   ```powershell
   $k = ((dotnet user-secrets list --project C:\Projects\Reporting-Service\src\Reporting.Api | Select-String '^ApiKeys:Primary').Line -replace '^ApiKeys:Primary\s*=\s*','').Trim()
   dotnet user-secrets set "ReportingApi:ApiKey" $k --project C:\Projects\SM-Portal\src
   ```
   Then restart the portal.
2. **Your Windows sign-in contains the group.** You must be in `grp-fin-manager` (or `rpt-reader`) **and**
   have signed in to Windows *since you were added*. Check:
   ```powershell
   whoami /groups | Select-String fin-manager      # should print SRXGLOBAL\grp-fin-manager
   $env:LOGONSERVER                                # should be a domain controller, not your laptop's name
   ```
3. **The role is mapped.** `config/rbac-config.json` → `Reporting_Read` lists `rpt-reader` and
   `grp-fin-manager` (see the README).

---

## Troubleshooting

Check the portal's **startup output** first. A healthy start prints
`[ReportAccess] Role Reporting_Read ← SRXGLOBAL\grp-fin-manager`.

| Symptom | Cause | Fix |
|---|---|---|
| Tile disabled; `/api/reports/access` → `{"allowed":false}`; `/api/reports` → `[]`, **and** your token has the group | The portal started before the domain was reachable, so it could not resolve the group name | Restart the backend portal with the VPN connected. Look for the `←` line above |
| Same, and `whoami /groups` does **not** show the group | Your Windows sign-in is older than your group membership | **Sign out of Windows** (not the portal's Sign Out button) and sign back in, or restart. Locking and unlocking does not refresh it. Then check `$env:LOGONSERVER` names a domain controller — a laptop name means a cached sign-in, which reuses the old group list |
| Signed in again right after the group was added, still missing | A new membership takes time to reach every domain controller; the one that signed you in may not have it yet | Wait and sign in again. Do not assume the AD change failed |
| `/api/reports` → **502** "temporarily unavailable" | Reporting-Service is not running, or it rejects the portal's key (401) | Start Reporting-Service; compare the two keys (above); restart the portal after changing the secret. The portal's circuit breaker holds for 30 s after repeated failures |
| `nltest /dsgetdc:srxglobal.com` fails (error **1355**) **even with the VPN on** | The VPN's DNS servers do not serve the AD zone, so Windows cannot find a domain controller. Group names then cannot be resolved | Needs IT (the VPN's DNS). Observed 2026-10-15: GlobalProtect's DNS servers answered `srxglobal.com` with a public address and no domain controllers, while the corporate DNS server (10.10.0.150) returned all of them. How it was resolved that day was **not recorded** — add it here. An untested workaround (elevated PowerShell): `Add-DnsClientNrptRule -Namespace ".srxglobal.com" -NameServers "10.10.0.150"` |
| Startup error: `AD group SRXGLOBAL\rpt-reader … not found` | The Application Role group `rpt-reader` has not been created in AD yet | Expected and harmless; `grp-fin-manager` is listed alongside it, so access still works |
| `401` calling Reporting-Service from PowerShell with the key from user-secrets | The key ends in `=` (base64). Splitting the line on `=` cuts the last character off | Remove only the `ApiKeys:Primary =` prefix with `-replace`, as above. Never `Split('=')` |
| Local report shows different data than UAT | Reporting-Service defaults to **company 300** in Development (UAT and production use 100) | Choose Company 100 on the form, or pass `companyCode`. The workbook's **Assumptions** sheet states the company used |
| `dotnet` build fails: *file is locked by Reporting.Api / MovexPortal.API* | An instance is already running from the same folder | Stop it, or build elsewhere: `dotnet test tests -o <other folder>` |
| Port 5050 already in use | The portal's port is fixed in `Program.cs`; only one backend can run at a time | Stop the other instance |

---

## Working without the domain (offline)

If you cannot reach a domain controller at all, you can still test the Reports flow by mapping the role to a
group that is already in your token — **Domain Users** — using a local override. It touches no repo file
and tests the portal-to-report path, **not** your real group membership:

```powershell
cd C:\Projects\SM-Portal
$sid = [Security.Principal.WindowsIdentity]::GetCurrent().User.AccountDomainSid.Value + '-513'   # Domain Users
$cfg = Get-Content .\config\rbac-config.json -Raw | ConvertFrom-Json
($cfg.roles | Where-Object name -eq 'Reporting_Read').adGroups = @($sid)
$path = "$env:TEMP\rbac-config.local.json"
[IO.File]::WriteAllText($path, ($cfg | ConvertTo-Json -Depth 6), (New-Object Text.UTF8Encoding $false))
$env:Rbac__ConfigPath = $path
dotnet run --project .\src\MovexPortal.csproj
```

Close the terminal afterwards so `Rbac__ConfigPath` does not linger. An entry in `adGroups` that already looks
like a SID (`S-1-5-21-…`) is used as is, with no name lookup.

---

## How access is decided

1. Windows authentication gives the portal your group **SIDs** (`groupsid` claims) — never group names.
2. At startup, `ReportAccess` resolves each `adGroups` name for the role `Reporting_Read` to a SID.
3. Each report in the Reporting-Service catalog names the role it needs (`requiredRole`). You see and can
   download a report only if one of your SIDs is in that role.

If nothing resolves, nobody gets in — deliberately. See the README section *Reports access* for the config.
