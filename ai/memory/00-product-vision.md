# Scanfil APAC Portal — Product Vision

**Last Updated**: March 2026
**Status**: Active — Phase 1 Deployed, Phase 2 In Progress
**Version**: 0.3.0

---

## Vision Statement

The Scanfil APAC Portal is the **single, secure browser-based gateway** through which Scanfil APAC staff interact with all technology systems across the organisation — ERP, compliance, financial data, reporting, and future integrations — without requiring technical expertise, custom tooling, or direct system access.

Where the portal began as a safe interface to M3 MOVEX, it is now evolving into the **central integration hub** for every technology solution Scanfil APAC operates or adopts.

---

## Strategic Positioning

```
BEFORE (Siloed Access)                         AFTER (Unified Gateway)
──────────────────────────────────────────────────────────────────────────
 Users → M3 via email to IT                    Users → Scanfil APAC Portal
 Users → Invoices via separate tool              └── M3 MOVEX (MMS175, MMS200, etc.)
 Users → Exchange rates via manual lookup        └── LHDN e-Invoicing (MyInvois)
 Users → Reports via Crystal Reports             └── RBA Exchange Rates
 Users → Future systems via TBD                  └── Reports (Cost, Finance, Inventory)
                                                  └── Future systems (WMS, MES, PLM, IoT)
```

**Every technology solution Scanfil APAC adds will be accessed through this portal.**
The portal is not a point solution — it is infrastructure.

---

## Problems Being Solved

### 1. Fragmented Access (Strategic)
Staff navigate multiple disconnected tools, access methods, and interfaces for different systems. There is no unified point of control, no consistent security model, and no single audit trail across systems.

### 2. Technical Barrier to ERP & Business Systems
Only developers and IT can interact with M3 APIs, invoice systems, or extract financial data. Business users depend on IT for operations that should be self-service.

### 3. Compliance & Audit Gaps
Actions across systems are logged in different places (or not at all). ISO 27001 compliance requires WHO/WHAT/WHEN/RESULT for every significant operation — not achievable when access is fragmented.

### 4. Integration Velocity
Each new system integration currently requires bespoke tooling. The portal eliminates this by providing a standard, config-driven integration pattern that any new system can plug into.

### 5. User Experience Deficit
Postman collections, command-line tools, and raw API responses are not acceptable for business users. The portal provides consistent, modern UX regardless of the underlying system.

---

## What the Portal Is Now

The portal is deployed and in active use on SRXWEBAPP1. Current integrations as of March 2026:

| Integration | Type | Status | Portal Feature |
|---|---|---|---|
| **M3 MOVEX** | ERP — Generic endpoint executor | Framework live, M3 socket adapter in progress | `/endpoints` |
| **MyInvois-Service** | LHDN e-Invoicing | Live | `/invoices` — AP/AR invoice extract |
| **Reporting-Service** | BI / Exchange Rates | Live | `/exchange-rates` — RBA SPOT rates |
| **Active Directory** | Identity & RBAC | Live | Windows Auth, AD group → role mapping |
| **SQL Server Audit** | Compliance logging | Live | Immutable audit trail, 7-year retention |

---

## What the Portal Is Becoming

Every system Scanfil APAC operates is a candidate integration. The pattern is consistent:

1. Backend service exposes a REST API
2. SM-Portal adds a proxy controller with RBAC and audit logging
3. Frontend adds a page or widget
4. Config-driven RBAC controls who can access what

**Active integration candidates in the Scanfil APAC portfolio:**

| System | Project | Integration Purpose |
|---|---|---|
| **Reporting-Service** | `c:\Projects\Reporting-Service` | Cost, finance, inventory, procurement reports (7 domains, Excel/PDF/JSON) |
| **WMS** | `c:\Projects\WMS` | Warehouse operations — receiving, put-away, pick, dispatch |
| **MMES** | `c:\Projects\MMES` | Manufacturing execution — production tracking, quality events |
| **PLM** | `c:\Projects\PLM` | Product lifecycle — BOM management, change control, specifications |
| **DIFOT** | Reporting | Delivery In Full On Time — tracking, alerts, trend analysis |
| **MyInvois-Service** | `c:\Projects\MyInvois-Service` | LHDN e-invoicing Phase 2 — submission status, validation |
| **IoT** | Future | Machine telemetry, downtime alerts, OEE tracking |
| **Knowledge Management** | `c:\Projects\Knowledge-Management` | Runbooks, SOPs, searchable knowledge base |

---

## Target Users

### Primary Users (Operations)

| Persona | Systems Accessed | Volume | Risk Profile |
|---|---|---|---|
| **Warehouse Staff** | M3 Item Movement, WMS receiving/dispatch | 50+ users | Medium |
| **Production Planners** | M3 Item/BOM, MES production orders | 20+ users | High |
| **Finance Team** | M3 financial postings, invoice extract, exchange rates, cost reports | 10+ users | Critical |
| **Quality Engineers** | MES quality events, PLM specifications | 10+ users | High |
| **Procurement** | M3 purchase orders, LHDN supplier invoices | 10+ users | High |

### Secondary Users (Oversight)

| Persona | Purpose | Access |
|---|---|---|
| **IT Administrators** | RBAC config, endpoint registry, health monitoring, secrets rotation | Admin |
| **ISO Auditors** | Compliance audit, log export and review | Read-only |
| **Management** | DIFOT dashboards, KPI views, executive reports | Read-only |

---

## Core Capabilities

### Live (Phase 1 — Q1 2026)

1. **Windows AD Authentication & RBAC**
   Transparent NTLM/Kerberos login. AD group membership drives role assignment.
   Role drives which portal features and endpoints are accessible.

2. **Generic M3 Endpoint Executor**
   Config-driven framework for any M3 MI program/method. Field validation built in.
   New M3 operations are added via `config/endpoint-registry.json` — no code required.

3. **LHDN Invoice Extract** (via MyInvois-Service)
   AP/AR invoice history with date range and type filters. Excel export for Finance team.
   First live integration beyond M3 — establishes the proxy integration pattern.

4. **RBA Exchange Rate Lookup** (via Reporting-Service)
   Daily SPOT rates via the Reporting-Service's RBA sync. Weekend/holiday fallback.
   Used by Finance team for multi-currency invoice reconciliation.

5. **ISO 27001 Audit Trail**
   Every operation logged: WHO, WHAT, WHEN, RESULT, risk level.
   Immutable JSONL file, risk-tiered retention (7 years for CRITICAL operations).

### In Development (Phase 2 — Q2 2026)

6. **Reporting Portal** (via Reporting-Service)
   Cost Management, Finance, Inventory, and Procurement reports.
   Interactive parameter forms. Download in JSON, Excel, or PDF.

7. **M3 Socket Integration**
   Live M3 MOVEX transactions via MI socket protocol.
   Phase 2 endpoints: MMS175 (item movement), MMS200 (item lookup), MMS310, MMS850.

8. **Execution & Usage Dashboard**
   Endpoint usage statistics, active user counts, response time trends.
   System health at a glance — all integrations on one screen.

9. **Audit Log Viewer**
   Search, filter, and export audit events. Date range, user, risk level, system filters.
   Replaces manual log file inspection for compliance reviews.

### Planned (Phase 3 — Q3–Q4 2026)

10. **WMS Integration**
    Warehouse operations via portal: inbound receiving, inventory transfers, dispatch confirmation.
    Replaces direct WMS terminal access for common operations.

11. **MES Integration**
    Production execution: job card updates, quality event logging, downtime capture.
    Key input for OEE and DIFOT calculations.

12. **Approval Workflows**
    Multi-step approval chains for high-risk operations: financial postings, master data changes, large transfers.
    Approvers notified via portal; actions blocked until approval granted.

13. **Batch Operations**
    CSV upload for bulk M3 transactions and bulk invoice processing.
    Progress tracking with per-row success/failure audit.

14. **Self-Service Admin**
    Manage endpoint registry, RBAC config, and API key rotation via portal UI.
    Eliminates server-side config file editing for routine admin tasks.

### Strategic (Phase 4 — 2027+)

15. **PLM Integration** — BOM access, change requests, specification lookup
16. **IoT Telemetry** — Machine status, OEE, downtime alerts and trend analysis
17. **Knowledge Base** — Embedded runbooks and SOPs from the Knowledge Management vault
18. **Mobile Companion App** — React Native for floor staff (inventory scans, quality events)
19. **Executive Dashboards** — Cross-system BI aggregating data from all integrations
20. **Scanfil Group Integration** — Potential API connectivity to parent organisation systems

---

## Architecture Principles

1. **Gateway Pattern**
   The portal is infrastructure, not a monolith. Each integration is a thin proxy controller
   with standard RBAC and audit logging applied. The portal never implements business logic
   that belongs in the downstream service.

2. **Configuration Over Code**
   New M3 endpoints and low-complexity integrations are added via JSON config.
   Code is written for adapters; not for each individual operation.

3. **Security at the Gateway**
   Every request is authenticated, authorised, and audited before any downstream system is touched.
   The portal is the single enforcement point — downstream services trust the portal's identity assertion.

4. **System Isolation**
   The portal holds connection credentials for its own database and audit log only.
   Downstream service credentials live in each service's own secrets file.
   The portal forwards requests with X-Correlation-Id headers.

5. **Progressive Enhancement**
   Start with read-only, low-risk integrations. Add write operations only after RBAC and
   audit logging are validated in that domain. Prove safety before expanding scope.

6. **Independent Integration Deployability**
   Adding a new integration never breaks existing ones.
   Each integration is a new controller + frontend page. Existing routes are not touched.

---

## Security & Compliance

| Concern | Implementation |
|---|---|
| Authentication | Windows Integrated Auth (IIS NTLM/Kerberos) — transparent, no password forms |
| Authorisation | RBAC — AD groups → portal roles → allowed endpoints per system |
| Audit trail | JSONL, WHO/WHAT/WHEN/RESULT, risk-tiered retention, immutable |
| Field masking | Sensitive field values masked in audit log automatically |
| Secrets | Per-service API keys in NTFS-protected `secrets.json` (production) |
| Network | On-premises only, IP allow-list at firewall |
| Transport | HTTPS/TLS 1.2+, HSTS enabled |
| Data Protection | Keys persisted to `C:\inetpub\SM-Portal\keys` (LoadUserProfile=true) |

**ISO 27001 Controls:**

| Control | Implementation |
|---|---|
| A.9.2.1 Access Control Policy | RBAC with AD groups |
| A.9.4.1 Information Access Restriction | Role-to-endpoint mappings enforced |
| A.12.4.1 Event Logging | All operations audited |
| A.12.4.3 Administrator Logs | Admin actions tagged CRITICAL |
| A.18.1.5 Regulation Compliance | 7-year retention, immutable trail |

**Audit retention by risk level:**

| Risk Level | Retention |
|---|---|
| CRITICAL | 7 years (2,555 days) |
| HIGH | 3 years (1,095 days) |
| MEDIUM | 1 year (365 days) |
| LOW | 90 days |

---

## Success Metrics

### Phase 1 (Q1 2026 — Live)
- ✅ Windows AD authentication deployed
- ✅ RBAC middleware live and tested
- ✅ Invoice extract accessible to Finance
- ✅ Exchange rates accessible to Finance
- ✅ Audit logging active with risk-tiered retention
- ⏳ 50+ active users within 30 days of M3 endpoint launch
- ⏳ <2s average response time across all integrations
- ⏳ 100% audit coverage for all exposed operations

### Phase 2 (Q2 2026)
- 150+ active users across Warehouse, Finance, Production
- M3 socket integration live: MMS175, MMS200, MMS310
- Reporting portal accessible: Cost Management reports
- 80% of common operations completed without IT intervention

### Phase 3 (Q3–Q4 2026)
- WMS and MES integrations live — floor staff using portal daily
- Zero ISO 27001 findings related to system access control
- Approval workflows active for high-risk M3 and financial operations
- Admin team managing RBAC and endpoints via UI

### Long-Term (2027+)
- All Scanfil APAC production systems accessible via portal
- Single, unified audit trail across all systems
- Portal is the default access point for every new system Scanfil APAC adopts

---

## Related Projects

| Project | Path | Relationship to Portal |
|---|---|---|
| MOVEX REST API | `c:\Projects\MOVEX\API-Integration\movex-rest-api` | M3 MI transaction layer |
| MyInvois-Service | `c:\Projects\MyInvois-Service` | LHDN e-invoicing backend (proxy target) |
| Reporting-Service | `c:\Projects\Reporting-Service` | Reports and exchange rates (proxy target) |
| WMS | `c:\Projects\WMS` | Warehouse management (Phase 3 integration) |
| MMES | `c:\Projects\MMES` | Manufacturing execution (Phase 3 integration) |
| PLM | `c:\Projects\PLM` | Product lifecycle (Phase 4 integration) |
| Knowledge-Management | `c:\Projects\Knowledge-Management` | Org knowledge vault (Phase 4 integration) |
| MAS Framework | `c:\Projects\.github` | Agent registry, skills, governance |
