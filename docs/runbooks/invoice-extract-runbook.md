---
topic: SM-Portal Invoice Extract — Operational Runbook
category: runbook
system: SM-Portal
feature: Invoice Extract
route: GET /api/invoices
upstream: MyInvois.Api (localhost:5051)
effective_date: 2026-03-11
last_reviewed: 2026-03-11
related_decisions: [ADR-001, ADR-015]
---

# SM-Portal Invoice Extract — Operational Runbook

**Version**: 1.0
**Last Updated**: 2026-03-11
**Purpose**: Operational guidance for the Invoice Extract feature — normal operations,
troubleshooting, key rotation, and deployment
**Target Audience**: DevOps engineers, system administrators

---

## Table of Contents

1. [Overview](#overview)
2. [Endpoint Reference](#endpoint-reference)
3. [Normal Operations](#normal-operations)
4. [Troubleshooting](#troubleshooting)
5. [Polly Circuit Breaker Behavior](#polly-circuit-breaker-behavior)
6. [Key Rotation](#key-rotation)
7. [Deployment Checklist](#deployment-checklist)

---

## Overview

The Invoice Extract feature allows authenticated domain users to query and export invoice
data (Accounts Payable and Accounts Receivable) directly from the SM-Portal web interface.

**Data flow:**

```
Browser (Windows AD user)
  └─► SM-Portal  GET /api/invoices  (Windows Authentication — IIS Negotiate)
        └─► InvoiceApiClient  GET /api/v1/invoices  (API-key header, Polly resilience)
              └─► MyInvois.Api  :5051  (ASP.NET Core, separate IIS site)
                    └─► IBM DB2 / AS400  MVXCOBJ schema  (DB2 credentials stay here)
```

**User access**: All Windows AD authenticated users can access the `/invoices` route and the
`GET /api/invoices` endpoint. No additional AD security group membership is required beyond
a valid domain account. Authorization is handled entirely by Windows Authentication at the
IIS level — SM-Portal does not add role restrictions to this endpoint.

**Excel export**: The frontend (`InvoicesPage.tsx`) uses **SheetJS** to generate an `.xlsx`
file client-side from the JSON payload returned by the API. No server-side Excel generation
is involved. The export button is available once data has loaded successfully.

---

## Endpoint Reference

### SM-Portal Endpoint

```
GET /api/invoices
Host: srxwebapp1.srxglobal.com
Authentication: Windows Authentication (Negotiate / NTLM)
```

**Query parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `fromDate` | `yyyy-MM-dd` | Yes | Start of date range (inclusive) |
| `toDate` | `yyyy-MM-dd` | Yes | End of date range (inclusive) |
| `type` | `AP` \| `AR` \| `ALL` | No | Invoice type filter. Defaults to `ALL` |

**Example:**
```
GET /api/invoices?fromDate=2026-01-01&toDate=2026-01-31&type=AP
```

**Success response** (`200 OK`):
```json
{
  "invoices": [
    {
      "invoiceNumber": "INV-2026-0001",
      "type": "AP",
      "date": "2026-01-15",
      "supplierOrCustomer": "ACME Sdn Bhd",
      "amount": 12500.00,
      "currency": "MYR",
      "status": "Submitted"
    }
  ],
  "totalCount": 1,
  "fromDate": "2026-01-01",
  "toDate": "2026-01-31"
}
```

---

### Upstream Endpoint (MyInvois.Api)

```
GET /api/v1/invoices
Host: localhost:5051
Authentication: API key header (X-Api-Key)
```

SM-Portal's `InvoiceApiClient` passes the configured `MyInvoisApi:ApiKey` user-secret as
the `X-Api-Key` header on every upstream request. The upstream supports the same
`fromDate`, `toDate`, and `type` query parameters, which SM-Portal forwards verbatim.

---

## Normal Operations

### Verifying the Invoice Endpoint is Healthy

Run the following from SRXWEBAPP1 (uses the machine's Windows identity — valid for
testing the Windows Auth layer):

```powershell
# Basic health check — confirm 200 and non-empty invoice array
$url = "http://localhost/api/invoices?fromDate=2026-01-01&toDate=2026-01-31&type=ALL"
$response = Invoke-WebRequest -Uri $url -UseDefaultCredentials -UseBasicParsing
$response.StatusCode          # Expected: 200
($response.Content | ConvertFrom-Json).totalCount   # Expected: integer >= 0
```

From a developer workstation with `curl` and SSPI:

```bash
curl --negotiate -u : \
  "http://srxwebapp1.srxglobal.com/api/invoices?fromDate=2026-01-01&toDate=2026-01-31" \
  -i
```

**Expected response shape:**

- HTTP status: `200 OK`
- `Content-Type: application/json; charset=utf-8`
- Body: JSON object with `invoices` array and `totalCount` integer
- `totalCount` may be `0` if the date range contains no invoices — this is not an error

### Verifying MyInvois.Api is Running

```powershell
# From SRXWEBAPP1 — check the upstream directly (bypasses SM-Portal)
Invoke-WebRequest -Uri "http://localhost:5051/health" -UseBasicParsing
# Expected: 200 OK, body: "Healthy"
```

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| `401 Unauthorized` from `GET /api/invoices` | Windows AD authentication not configured, or user is not authenticated | Verify IIS Windows Authentication is **Enabled** and Anonymous Authentication is **Disabled** on the SM-Portal `/api` sub-application. Check `src/web.config`. Confirm the user's browser supports Negotiate/NTLM (all domain-joined machines do by default). |
| `502 Bad Gateway` from `GET /api/invoices` | MyInvois.Api is unreachable on port 5051 | (1) Check IIS Manager — confirm the **MyInvois.Api** site exists and its app pool is **Started**. (2) Run `Invoke-WebRequest http://localhost:5051/health` on SRXWEBAPP1. (3) Check Windows Event Log for app pool crash entries (Source: `IIS-W3SVC-WP`). |
| "Invoice service temporarily unavailable" banner in UI | MyInvois.Api is down and Polly has exhausted all retries; circuit is open | Same as 502 above. Polly will automatically close the circuit 30 seconds after the last failure once MyInvois.Api responds. No SM-Portal recycle is needed — the recovery is automatic. |
| API returns `200` but `invoices` array is empty | Date range too narrow, or the DB2 query returned no rows for the period | Widen the `fromDate`/`toDate` range. Confirm with the finance team that invoices exist in M3 for that period. Run the same date range directly against MyInvois.Api endpoint to isolate whether the issue is in SM-Portal or upstream. |
| Excel export shows numbers as text (sorting fails in Excel) | Decimal values serialised as strings instead of JSON numbers | Verify the upstream JSON uses numeric types for amount fields (`12500.00`, not `"12500.00"`). If SheetJS receives strings, it writes them as Excel text cells. Fix is in MyInvois.Api serialisation — amount fields must be `decimal`/`double` in the C# model, not `string`. |
| Frontend `/invoices` route shows a blank page | React Router not rendering `InvoicesPage`, or the route is missing from `App.tsx` | (1) Open browser DevTools Console — look for JS errors. (2) Confirm `<Route path="/invoices" element={<InvoicesPage />} />` exists in `App.tsx`. (3) Ensure the IIS URL Rewrite SPA fallback rule is active (all non-file, non-`/api` requests rewrite to `index.html`). |

---

## Polly Circuit Breaker Behavior

SM-Portal's `InvoiceApiClient` is registered with two Polly policies applied in order:

**1. Retry policy**

- Retries up to **3 times** on transient HTTP failures (5xx, network errors, timeouts)
- Exponential backoff: wait **2 s**, then **4 s**, then **8 s** between attempts
- Total maximum wait before giving up: ~14 seconds per request

**2. Circuit breaker policy**

- Circuit **opens** (stops forwarding requests) after **5 consecutive failures**
- When open, all calls to `InvoiceApiClient` immediately return a `BrokenCircuitException`
  without attempting the network call — this protects MyInvois.Api from being flooded
  while it is recovering
- Circuit **half-opens** after **30 seconds**, allowing one probe request through
- If the probe succeeds, the circuit **closes** and normal operation resumes
- If the probe fails, the circuit remains open for another 30 seconds

**User-visible impact during an outage:**

| Time after outage starts | User experience |
|--------------------------|----------------|
| 0–14 s (retry window) | Slow response; request is being retried |
| 14 s–circuit opens | `502` or "Invoice service temporarily unavailable" |
| Circuit open (up to ~5 min) | Immediate `502` — no retry delay; other SM-Portal features unaffected |
| After MyInvois.Api recovers | First request after 30 s probe succeeds; circuit closes; normal service |

No action is required from operations staff unless MyInvois.Api does not recover on its own.

---

## Key Rotation

When the primary API key in **MyInvois.Api** is rotated, SM-Portal must be updated to match.
No code change or redeployment is required — only a user-secret update and app pool recycle.

**Steps:**

1. Obtain the new primary key value from the MyInvois.Api administrator.

2. On SRXWEBAPP1, open a command prompt as the SM-Portal-Backend app pool identity
   (or as a user with access to that profile), and run:

   ```bash
   # Run from C:\Projects\SM-Portal\src\ (or wherever the .csproj lives on the server)
   dotnet user-secrets set "MyInvoisApi:ApiKey" "<new key value>"
   ```

   Alternatively, update the secret directly in the Windows Data Protection–backed secrets
   file at:
   ```
   %APPDATA%\Microsoft\UserSecrets\<UserSecretsId>\secrets.json
   ```

3. Recycle the **SM-Portal-Backend** app pool to pick up the new secret:

   ```powershell
   Restart-WebAppPool -Name "SM-Portal-Backend"
   ```

4. Verify the endpoint works with the new key:

   ```powershell
   Invoke-WebRequest -Uri "http://localhost/api/invoices?fromDate=2026-01-01&toDate=2026-01-31" `
     -UseDefaultCredentials -UseBasicParsing | Select-Object StatusCode
   # Expected: 200
   ```

5. Confirm MyInvois.Api's own key rotation is complete before recycling SM-Portal — a
   mismatch window will cause `401` errors from the upstream.

---

## Deployment Checklist

### Pre-Deployment

- [ ] MyInvois.Api has been deployed and its IIS site is running on port 5051
- [ ] `GET http://localhost:5051/health` returns `200 OK` on SRXWEBAPP1
- [ ] SM-Portal user-secret `MyInvoisApi:ApiKey` has been set (matches MyInvois.Api primary key)
- [ ] `appsettings.json` `MyInvoisApi:BaseUrl` is `http://localhost:5051/` (verify — do not change unless hosting differs)
- [ ] Confirmed that `MovexDb:ConnectionString` does NOT appear in SM-Portal's user-secrets, `appsettings.json`, or `appsettings.Production.json`
- [ ] Frontend build (`npm run build`) includes the `/invoices` route and `InvoicesPage.tsx`
- [ ] Backend build (`dotnet publish -c Release`) completed without errors
- [ ] IIS URL Rewrite SPA fallback rule is in place (required for `/invoices` deep-link)

### Post-Deployment

- [ ] SM-Portal-Backend app pool is in **Started** state
- [ ] SM-Portal-Frontend app pool is in **Started** state
- [ ] `GET /health` on SM-Portal returns `200 OK`
- [ ] Navigate to `/invoices` in a browser — page renders without blank screen or JS errors
- [ ] Enter a valid date range and confirm the invoice table loads
- [ ] Click **Export to Excel** and confirm `.xlsx` file downloads with correct numeric values
- [ ] Verify `401` is returned for an unauthenticated request (e.g., `curl` without credentials)
- [ ] Check Windows Event Log on SRXWEBAPP1 for any error entries immediately after deployment

---

**Document Status**: Active
**Next Review**: 2026-06-11
**Owner**: IT Manager
