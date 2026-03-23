# Scanfil APAC Portal — Product Roadmap

**Last Updated**: March 2026
**Status**: Active
**Current Version**: 0.3.0

---

## Current State (March 2026)

The portal is deployed to SRXWEBAPP1 and serving real users. It is no longer a "MOVEX portal" —
it is Scanfil APAC's enterprise integration gateway. Phase 1 is largely complete.

| Capability | Status |
|---|---|
| Windows AD Authentication + RBAC | ✅ Live |
| LHDN Invoice Extract (MyInvois-Service) | ✅ Live |
| RBA Exchange Rate Lookup (Reporting-Service) | ✅ Live |
| ISO 27001 Audit Logging | ✅ Live |
| M3 Endpoint Executor (framework) | ✅ Live — socket adapter pending |
| React SPA + shadcn/ui UI | ✅ Live |
| IIS Deployment (SRXWEBAPP1) | ✅ Live |

---

## Phase 1: Foundation (Q1 2026) — COMPLETE

**Goal:** Establish the portal as a secure, deployed platform with working integrations.

### Delivered
- ✅ Skills registry and architecture documentation
- ✅ React SPA decision + approval (Decision-001)
- ✅ RBAC middleware with AD group integration
- ✅ Audit logging framework (JSONL, risk-tiered retention)
- ✅ MyInvois-Service proxy — invoice extract (AP/AR, date range, Excel export)
- ✅ Reporting-Service proxy — RBA SPOT exchange rates
- ✅ IIS deployment to SRXWEBAPP1 — both frontend and backend pools
- ✅ 7 deployment lessons documented, prevention checklists created
- ✅ Windows AD auth (Negotiate/NTLM, environment-aware)

### Still In Progress (Phase 1 tail)
- ⏳ M3 socket adapter (GenericEndpointExecutor completion)
- ⏳ OpenAPI/Swagger documentation

---

## Phase 2: Reporting & M3 Live (Q2 2026)

**Goal:** Complete M3 integration and connect the Reporting-Service portal features.

### M3 MOVEX Endpoints
- MMS175MI/Update — Item Movement (inventory transfer between locations)
- MMS200MI — Item Lookup (item master, stock balance)
- MMS310MI — Item creation / BOM
- MMS850MI — Production order management
- Config-driven: additional endpoints via `endpoint-registry.json`, no code

### Reporting Portal
- Integrate Reporting-Service report execution API
- Cost Management reports: Average Cost Snapshot, WAC History, Cost Variance Analysis
- Report parameter forms auto-generated from Reporting-Service catalog
- Download in JSON, Excel, or PDF
- Report catalog displays reports user is authorised to run (RBAC)

### Dashboard & Monitoring
- Execution statistics: call counts, average response time per integration
- Active user counts
- System health panel: all downstream services at a glance
- Per-integration error rate and circuit breaker state

### Audit Log Viewer
- Search by user, system, date range, risk level
- Export filtered results to Excel
- Replaces manual log file inspection

### Infrastructure
- RBAC config updated: Reporting roles added (Report_Read, Report_Finance, etc.)
- Reporting-Service secrets (X-API-Key) added to `secrets.json` on SRXWEBAPP1

---

## Phase 3: WMS, MES, Approval Workflows (Q3–Q4 2026)

**Goal:** Bring warehouse and manufacturing operations into the portal. Add governance for high-risk actions.

### WMS Integration
- Inbound receiving confirmation
- Inventory transfer requests
- Dispatch confirmation
- Location query
- Integration requires WMS REST API to be ready (`c:\Projects\WMS`)

### MES Integration
- Production job card updates
- Quality event logging
- Downtime capture
- OEE contribution data
- Integration requires MMES REST API to be ready (`c:\Projects\MMES`)

### Approval Workflows
- Multi-step approval chains for CRITICAL and HIGH risk operations
- Configurable approver groups per endpoint/operation
- Email notification to approvers
- Action blocked in portal until approval granted or rejected
- Approval decisions recorded in audit log

### Batch Operations
- CSV upload for bulk M3 transactions
- Bulk invoice processing
- Per-row success/failure in results view
- Full audit trail for each row

### Self-Service Admin
- Manage endpoint registry via portal UI
- RBAC configuration UI (add/remove AD groups, assign endpoints)
- API key rotation UI (triggers `Setup-ServerSecrets.ps1` via admin API)
- Eliminates server-side config file editing for routine admin tasks

### DIFOT Dashboard
- Delivery In Full On Time KPIs surfaced in portal
- Trend analysis, exception alerts
- Integration with DIFOT reporting project

---

## Phase 4: Strategic Expansion (2027+)

**Goal:** Complete the vision — every Scanfil APAC technology system accessible through the portal.

### PLM Integration
- Product lifecycle management: BOM lookup, change request submission, specification access
- Integration requires PLM REST API to be ready (`c:\Projects\PLM`)

### IoT Telemetry
- Machine status, OEE, downtime dashboards
- Alert management (acknowledge, escalate)
- Integration requires IoT platform API

### Knowledge Base Integration
- Searchable runbooks and SOPs from the Knowledge Management vault
- Contextual help: relevant runbooks surfaced next to portal features
- Integration via `c:\Projects\Knowledge-Management`

### Mobile Companion App
- React Native for floor staff
- Inventory scanning (barcode → M3 lookup)
- Quality event quick-entry
- Real-time notifications

### Executive Dashboards
- Cross-system BI aggregating data from all integrations
- KPI roll-up: DIFOT, OEE, financial, compliance
- Export to Excel/PDF for board reporting

### Scanfil Group Connectivity (If Applicable)
- Potential API integration to parent organisation systems
- Subject to architecture review and security clearance

---

## Integration Onboarding Pattern

When a new system is ready to be integrated into the portal, follow this pattern:

1. Backend service exposes a REST API with health endpoint
2. SM-Portal team reviews the API contract
3. New proxy controller added to `src/Controllers/`
4. RBAC roles for the new system added to `config/rbac-config.json`
5. Secrets for the new service added to `C:\ProgramData\SRX\SM-Portal\secrets.json`
6. Frontend page or component added
7. Audit logging verified: all operations are captured
8. Pre-deployment checklist completed; deployed to UAT, then Production
9. User training and communication issued

---

## Dependencies

| Phase | Dependency | Owner | Status |
|---|---|---|---|
| Phase 2 | Reporting-Service Phase 1 complete | Reporting team | ✅ In progress |
| Phase 2 | M3 socket adapter implementation | Portal dev team | ⏳ In progress |
| Phase 3 | WMS REST API available | WMS team | ⏳ Planned |
| Phase 3 | MMES REST API available | MES team | ⏳ Planned |
| Phase 3 | DIFOT reporting API | Reporting team | ⏳ Planned |
| Phase 4 | PLM REST API available | PLM team | 📋 Analysis phase |
| Phase 4 | IoT platform selection | IT Strategy | 📋 Under review |

---

## Review Cadence

- **Monthly**: Roadmap review at sprint retrospective
- **Quarterly**: Phase milestone assessment and priority adjustment
- **Event-driven**: Update immediately when a new integration is confirmed or deprioritised
