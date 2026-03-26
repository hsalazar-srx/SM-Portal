# Scanfil APAC Portal

**Enterprise Integration Gateway — Secure, Role-Based Access to All Scanfil APAC Technology Systems**

[![Status](https://img.shields.io/badge/status-live%20phase%201-brightgreen)]()
[![Frontend](https://img.shields.io/badge/frontend-react%2018%20%2B%20typescript-blue)]()
[![.NET](https://img.shields.io/badge/.NET-8.0-blue)]()
[![Deployment](https://img.shields.io/badge/deployment-SRXWEBAPP1%20IIS-green)]()
[![License](https://img.shields.io/badge/license-proprietary-lightgrey)]()

---

## Overview

The Scanfil APAC Portal is the **single secure browser-based gateway** through which Scanfil APAC staff interact with all technology systems — ERP, compliance, financial data, reporting, and future integrations — without requiring technical expertise, direct system access, or custom tooling.

Every system Scanfil APAC operates is a candidate integration. The portal provides a consistent, audited, RBAC-enforced interface regardless of the underlying system.

**Live on SRXWEBAPP1** — IIS deployment complete, production users active.

---

## Current Integrations (March 2026)

| Integration | System | Portal Feature | Status |
|---|---|---|---|
| **M3 MOVEX** | Infor M3 ERP | `/endpoints` — generic executor | Framework live, socket adapter in progress |
| **MyInvois-Service** | LHDN e-Invoicing | `/invoices` — AP/AR extract, Excel export | Live |
| **Reporting-Service** | RBA / BI | `/exchange-rates` — daily SPOT rates | Live |
| **Active Directory** | SRXGLOBAL.COM | Windows Auth + RBAC | Live |
| **Audit Log** | ISO 27001 | All operations, risk-tiered retention | Live |

---

## Key Features

| Feature | Status |
|---|---|
| Windows AD authentication (NTLM/Kerberos, transparent) | Live |
| Role-based access control — AD groups → portal roles → endpoints | Live |
| ISO 27001 audit trail — WHO/WHAT/WHEN/RESULT, immutable | Live |
| LHDN invoice extract — AP/AR with date range, type filter, Excel export | Live |
| RBA exchange rate lookup — SPOT rates with weekend/holiday fallback | Live |
| Config-driven M3 endpoint executor (no code per new M3 operation) | Framework live |
| React 18 + shadcn/ui + Tailwind CSS — modern, responsive UI | Live |
| IIS deployment — frontend SPA + backend API, two pools | Live |
| Polly resilience — retry + circuit breaker on all downstream calls | Live |

**Coming Phase 2 (Q2 2026):** Reporting portal (Cost, Finance, Inventory reports), M3 socket adapter, execution dashboard, audit log viewer.

---

## Architecture

The portal is a **gateway**, not a monolith. Each integration is a thin proxy controller with RBAC and audit logging applied uniformly. Adding a new system means adding a controller and a frontend page — existing integrations are never touched.

```
┌──────────────────────────────────────────────────────────────────┐
│                  Scanfil APAC Staff (HTTPS)                      │
└───────────────────────────┬──────────────────────────────────────┘
                            │ NTLM/Kerberos
┌───────────────────────────▼──────────────────────────────────────┐
│               Scanfil APAC Portal (SRXWEBAPP1)                   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  React SPA (IIS static pool)                            │    │
│  │  Auth · Invoices · Exchange Rates · [Reports Phase 2]   │    │
│  └─────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Portal API (IIS inprocess pool)                        │    │
│  │  RBAC Middleware → Controllers → Audit Logging          │    │
│  │  Auth / Endpoints / Invoices / ExchangeRates            │    │
│  └─────────────────────────────────────────────────────────┘    │
└───────┬──────────────────┬──────────────────┬────────────────────┘
        │                  │                  │
┌───────▼──────┐  ┌────────▼──────────┐  ┌────▼──────────────────┐
│ MOVEX        │  │ MyInvois-Service  │  │ Reporting-Service      │
│ REST API     │  │ :5051             │  │ :5052                  │
│ (M3 MI)      │  │ AP/AR invoices    │  │ RBA rates + reports    │
└───────┬──────┘  └────────┬──────────┘  └────┬──────────────────┘
        │                  │                  │
        └──────────────────┴──────────────────┘
                           │
                   DB2 (AS400) / SQL Server
```

**Future integrations (WMS → Phase 3, MES → Phase 3, PLM → Phase 4)** follow the same pattern — one new box and one `Rel` at each level.

---

## Technology Stack

| Concern | Technology |
|---|---|
| Runtime | .NET 8.0 ASP.NET Core |
| Frontend | React 18 + TypeScript + shadcn/ui + Tailwind CSS |
| Build tool | Vite |
| Authentication | Windows Integrated Auth (IIS NTLM/Kerberos) |
| Authorisation | Config-driven RBAC (AD groups → roles → endpoints) |
| Resilience | Polly v8 (retry + circuit breaker on all HTTP clients) |
| Logging | Serilog (structured JSON) + JSONL audit log |
| Secrets | NTFS-protected `secrets.json` on SRXWEBAPP1 |
| IIS | Two app pools: Frontend (static) + Backend (inprocess .NET 8) |

---

## Development Setup

### Prerequisites

- .NET 8.0 SDK
- Node.js 18+ (for frontend)
- IBM i ODBC driver (for M3 integration testing)
- Windows AD account on SRXGLOBAL.COM domain (for Windows Auth)

### Backend

```powershell
cd C:\Projects\SM-Portal

# Configure user secrets
cd src
dotnet user-secrets set "MyInvoisApi:ApiKey" "your-key"
dotnet user-secrets set "ReportingApi:ApiKey" "your-key"

# Run backend (Kestrel dev server, Negotiate auth)
dotnet run --project src/MovexPortal.csproj
# API available at http://localhost:5050
# Swagger at http://localhost:5050/swagger
```

### Frontend

```powershell
cd C:\Projects\SM-Portal\frontend

npm install
npm run dev
# SPA at http://localhost:5173
# Proxies /api calls to http://localhost:5050
```

### Test Authentication

```
GET http://localhost:5050/auth/test
# Returns your Windows identity, AD groups, and mapped portal roles
```

---

## Configuration

### Endpoint Registry (`config/endpoint-registry.json`)

Defines M3 endpoints available for execution. No code changes required — add a JSON entry.

```json
{
  "endpoints": [
    {
      "id": "mms175-update",
      "program": "MMS175MI",
      "method": "Update",
      "displayName": "Item Movement",
      "requiredRole": "Inventory_Write",
      "riskLevel": "HIGH",
      "category": "Inventory",
      "fields": [
        { "name": "WHLO", "description": "Warehouse", "required": true, "maxLength": 3 },
        { "name": "ITNO", "description": "Item Number", "required": true, "maxLength": 15 },
        { "name": "WHSL", "description": "From Location", "required": true, "maxLength": 10 },
        { "name": "TWSL", "description": "To Location", "required": true, "maxLength": 10 },
        { "name": "TRQT", "description": "Quantity", "required": true, "type": "decimal" }
      ]
    }
  ]
}
```

### RBAC Config (`config/rbac-config.json`)

Maps AD groups to portal roles, and roles to allowed endpoints.

```json
{
  "roles": [
    {
      "name": "Inventory_Write",
      "adGroups": ["MOVEX-API-FIN"],
      "allowedEndpoints": ["mms175-update"],
      "maxRiskLevel": "HIGH"
    }
  ]
}
```

---

## Project Structure

```
SM-Portal/
├── src/                        .NET 8 backend API
│   ├── Controllers/            Auth · Endpoints · Invoices · ExchangeRates
│   ├── Services/               Executor · RBAC · Registry · API clients
│   ├── Middleware/             RbacMiddleware · AuditLoggingMiddleware
│   ├── Models/                 DTOs and domain objects
│   ├── Program.cs              Startup — auth strategy, HTTP clients, middleware
│   ├── web.config              IIS InProcess hosting configuration
│   └── appsettings.json        Base configuration
├── frontend/                   React 18 + TypeScript + Vite
│   ├── src/
│   │   ├── components/         UI components (shadcn/ui + custom)
│   │   ├── services/           API clients (auth · invoices · exchange rates)
│   │   ├── context/            AuthContext (Windows AD session)
│   │   └── App.tsx             Router and auth guard
│   └── package.json
├── config/                     Runtime JSON config (copied to publish output)
│   ├── endpoint-registry.json  M3 endpoint definitions
│   └── rbac-config.json        Role ↔ AD group mapping
├── ai/
│   ├── memory/                 Long-term knowledge base (read before making changes)
│   │   ├── 00-product-vision.md
│   │   ├── 02-system-architecture.md
│   │   ├── 06-deployment-lessons-learned.md  ← read before any IIS deployment
│   │   └── 07-product-roadmap.md
│   ├── checklists/
│   │   └── pre-deployment-iis-validation.md
│   ├── evidence/               Decision logs, change impact records
│   └── rules.md
├── docs/                       Architecture diagrams, runbooks
├── scripts/                    PowerShell setup scripts
├── DEPLOYMENT_LESSONS_LEARNED.md
└── README.md
```

---

## Deployment

**Production and UAT share SRXWEBAPP1** — see [ai/memory/06-deployment-lessons-learned.md](ai/memory/06-deployment-lessons-learned.md) **before deploying** (7 issues, 8+ hours of hard-won experience).

**Pre-deployment checklist:** [ai/checklists/pre-deployment-iis-validation.md](ai/checklists/pre-deployment-iis-validation.md) — 50 items.

| Environment | Auth | Swagger | Notes |
|---|---|---|---|
| Development | Negotiate (Kestrel) | Enabled (`localhost:5050/swagger`) | Uses dotnet user-secrets |
| Production | Windows Auth (IIS) | Disabled | Uses NTFS `secrets.json` on SRXWEBAPP1 |

**Critical deployment rules (from lessons learned):**
1. Stop the **correct** app pool before copying files (`appcmd list app` first)
2. `ASPNETCORE_CONTENTROOT` must be the **hardcoded absolute path** in `web.config` — do NOT use `%APPL_PHYSICAL_PATH%` (not expanded by ANCM on SRXWEBAPP1)
3. Do NOT set `ASPNETCORE_URLS` (Kestrel port conflict)
4. `LoadUserProfile=true` on backend app pool (Data Protection key persistence)
5. Controller routes must NOT include the `/api` sub-app prefix
6. IIS URL Rewrite Module 2.1 must be installed
7. `MyInvoisApi:ApiKey` and `ReportingApi:ApiKey` must be in `secrets.json` before startup

---

## Security & Compliance

**Authentication:** Windows Integrated Auth — transparent NTLM/Kerberos, no password forms.

**Authorisation:** RBAC at middleware level — AD groups → portal roles → allowed endpoints.
Every RBAC decision (grant and deny) is written to the audit log.

**Audit trail:** JSONL append-only log, WHO/WHAT/WHEN/RESULT, risk-tiered retention:

| Risk Level | Retention |
|---|---|
| CRITICAL | 7 years |
| HIGH | 3 years |
| MEDIUM | 1 year |
| LOW | 90 days |

**ISO 27001 controls:** A.9.2.1 (access control), A.9.4.1 (information access restriction), A.12.4.1 (event logging), A.12.4.3 (administrator logs), A.18.1.5 (regulation compliance).

---

## Roadmap

See [ai/memory/07-product-roadmap.md](ai/memory/07-product-roadmap.md) for the full roadmap.

| Phase | Timeframe | Key Deliverables |
|---|---|---|
| **Phase 1** (complete) | Q1 2026 | Auth, RBAC, invoice extract, exchange rates, IIS deployment |
| **Phase 2** | Q2 2026 | M3 socket adapter live, reporting portal, dashboard, audit viewer |
| **Phase 3** | Q3–Q4 2026 | WMS integration, MES integration, approval workflows, batch ops |
| **Phase 4** | 2027+ | PLM, IoT, mobile app, executive dashboards |

---

## Related Projects

| Project | Path | Relationship |
|---|---|---|
| MOVEX REST API | `c:\Projects\MOVEX\API-Integration\movex-rest-api` | M3 MI transaction layer |
| MyInvois-Service | `c:\Projects\MyInvois-Service` | LHDN e-invoicing proxy target |
| Reporting-Service | `c:\Projects\Reporting-Service` | Reports and exchange rates proxy target |
| WMS | `c:\Projects\WMS` | Phase 3 integration target |
| MMES | `c:\Projects\MMES` | Phase 3 integration target |
| MAS Framework | `c:\Projects\.github` | Skills, agent registry, governance |

---

## AI Memory & Guidelines

Before making any changes to this project, read:

1. [ai/rules.md](ai/rules.md) — Development guidelines and safety rules
2. [ai/memory/00-product-vision.md](ai/memory/00-product-vision.md) — Portal vision and scope
3. [ai/memory/02-system-architecture.md](ai/memory/02-system-architecture.md) — Architecture principles
4. [ai/memory/06-deployment-lessons-learned.md](ai/memory/06-deployment-lessons-learned.md) — IIS deployment lessons (read before any deployment)
5. [ai/memory/07-product-roadmap.md](ai/memory/07-product-roadmap.md) — What's coming and why
