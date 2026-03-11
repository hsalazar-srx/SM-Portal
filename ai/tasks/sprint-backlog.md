# Sprint Backlog (Phase 1)

**Date**: 2026-02-25  
**Status**: Frontend Complete | Backend Planned  
**Last Updated**: Feb 25, 2026

## 🧩 Compliance Tasks

- [x] TASK-001: Complete skills audit (`ai/memory/00-skills-audit.md`)
- [x] TASK-002: Finalize integration contracts
- [x] TASK-003: Create required diagram docs in `docs/diagrams/`
- [x] TASK-004: Approve style guide & palette (`context/design/style-guide.md`)


## 🛠️ Backend Tasks

- [x] TASK-010: Create endpoint registry loader
- [x] TASK-013: Create endpoint discovery service
- [x] TASK-011: Implement RBAC middleware (complete)
- [x] TASK-012: Implement audit logging middleware
- [x] TASK-014: Add config placeholders (endpoint-registry.json, rbac-config.json)
- [x] TASK-015: Add /api/auth/test endpoint for RBAC testing

## 🎨 Frontend Tasks

- [x] TASK-020: Initialize React + Vite + Tailwind (Complete)
- [x] TASK-021: Build responsive component library (Complete - 10+ components)
- [x] TASK-022: Implement design system with tokens (Complete - 8px constraint-based spacing)
- [x] TASK-023: Add mobile-responsive navigation (Complete - Hamburger menu + ResponsiveHeader)
- [x] TASK-024: Create SignIn and WelcomePage (Complete)
- [x] TASK-025: Build ComponentShowcase page (Complete - /components route)

## 🧪 Testing Tasks

- [x] TASK-030: Define unit test coverage (RBAC tested)
- [x] TASK-031: Add integration test skeleton (RBAC tested)

---

**Note**: Frontend MVP complete (Feb 25, 2026). Backend architecture planned for Q1 2026. See [frontend/README.md](../../frontend/README.md) for implementation details.

---

---

# Phase 2: Audit Storage Migration (SQLite)

**Initiative:** SM-P2
**Epic:** Audit Storage Migration — SQLite
**Linked Plan:** `C:\Users\hsalazar\.claude\plans\harmonic-napping-hollerith.md` (Story 3)
**Cross-project:** MyInvois-Service runs parallel Sprints 5–7 (see `c:\Projects\MyInvois-Service\ai\tasks\sprint-backlog.md`)

---

## Sprint 3: ADR & Architecture Review (Mar 4-7, 2026)

### Work Items Summary

| ID | Task | Story | Status | Assignee | Effort | Priority |
|----|------|-------|--------|----------|--------|----------|
| TASK-040 | Create `ai/evidence/decision-005-sqlite-audit-storage.md` | Story 1 | ⏳ Ready | architect-system-design | 3h | P0 |
| TASK-041 | Update `ai/memory/04-governance-and-decisions.md` | Story 1 | ⏳ Ready | architect-system-design | 1h | P0 |
| TASK-042 | Update `ai/memory/02-system-architecture.md` (JSONL → SQLite) | Story 1 | ⏳ Ready | developer-dotnet | 1h | P0 |
| TASK-043 | Architecture Review sign-off → `ai/evidence/decision-log.md` | Story 1 | ⏳ Ready | architect-system-design | 1h | P0 |
| **Total** | | | | | **6h** | |

### Task Detail: TASK-040 — decision-005-sqlite-audit-storage.md

**File:** `c:\Projects\SM-Portal\ai\evidence\decision-005-sqlite-audit-storage.md`

**Content required:**
- **Status:** Proposed → Accepted (after Architecture Review)
- **Context:** SM-Portal uses JSONL flat files; not queryable, retention not enforced; misaligned with workspace audit standard
- **Decision:** Replace JSONL with `Microsoft.Data.Sqlite` + EF Core 8 (Code-First), per-project SQLite file
- **Topology decision — centralized vs per-service (must be fully documented):**
  - Considered: one shared audit DB in SM-Portal for all services (MyInvois + SM-Portal)
  - Rejected because:
    - MyInvois-Service is a scheduled batch, not triggered by users through SM-Portal
    - Its audit is a LHDN regulatory compliance record (7-year flat retention, 45 UBL-specific columns)
    - MyInvois must audit successfully even when SM-Portal is unavailable
    - Shared SQLite file creates write contention and tight coupling between independent services
    - Schemas are incompatible (EventType/RiskLevel vs InvoiceNumber/TIN/UUID)
  - Future note: if SM-Portal becomes a synchronous API gateway proxying all backend service calls, a centralized audit approach should be re-evaluated via a new ADR
- **Options considered:** SQL Server (added dependency), JSONL retained (not queryable), shared SQLite (coupling + contention), per-service SQLite (chosen)
- **Consequences:** Retention now actively enforced via `AuditRetentionService`; NTFS ACL required on `./data/audit.db`; `./logs/` folder retired

---

## Sprint 4: SQLite Implementation (Mar 10-14, 2026)

### Work Items Summary

| ID | Task | Story | Status | Assignee | Effort | Priority |
|----|------|-------|--------|----------|--------|----------|
| TASK-044 | Add NuGet packages to `MovexPortal.csproj` (Sqlite + EF Core) | Story 3 | ⏳ Ready | developer-dotnet | 1h | P0 |
| TASK-045 | Create `src/Data/AuditLogEntity.cs` (schema alignment to shared model) | Story 3 | ⏳ Ready | developer-dotnet | 3h | P0 |
| TASK-046 | Create `src/Data/AuditDbContext.cs` + `AuditDbContextFactory.cs` | Story 3 | ⏳ Ready | developer-dotnet | 2h | P0 |
| TASK-046b | Generate EF Core initial migration (`dotnet ef migrations add InitialCreate`) | Story 3 | ⏳ Ready | developer-dotnet | 1h | P0 |
| TASK-047 | Rewrite `src/Services/AuditService.cs` (JSONL → EF Core; keep `IAuditService` unchanged) | Story 3 | ⏳ Ready | developer-dotnet | 6h | P0 |
| TASK-048 | Update `src/Program.cs` (DI: AuditDbContext + AuditRetentionService) | Story 3 | ⏳ Ready | developer-dotnet | 2h | P0 |
| TASK-049 | Update `src/appsettings.json` + `appsettings.Development.json` (LogPath → DatabasePath) | Story 3 | ⏳ Ready | developer-dotnet | 1h | P0 |
| TASK-050 | Implement `src/Services/AuditRetentionService.cs` (IHostedService, daily cleanup) | Story 3 | ⏳ Ready | developer-dotnet | 4h | P1 |
| TASK-051 | Update `tests/AuditServiceTests.cs` (in-memory SQLite, verify masking + schema) | Story 3 | ⏳ Ready | developer-dotnet | 3h | P0 |
| TASK-052 | Full build + test run + code review | Story 3 | ⏳ Ready | Tech Lead | 3h | P0 |
| **Total** | | | | | **26h** | |

### Schema Alignment Reference (AuditEvent → AuditLogEntity)

| AuditEvent field | AuditLogEntity column | Mapping rule |
|------------------|----------------------|--------------|
| `eventType` | `Action` | Direct (e.g., "rbac-authorized", "execute") |
| `userId` | `UserId` | Direct (Windows identity) |
| `resourceId` | `ResourceId` | Direct (Program/Method path) |
| `riskLevel` | `Severity` | Low→Info, Medium→Warning, High→Error, Critical→Critical |
| `timestamp` | `Timestamp` | ISO 8601 UTC string |
| `data` (dict) | `RequestPayload` | `JsonSerializer.Serialize(data)` |
| *(derived)* | `Category` | Fixed: `"SM-Portal"` |
| *(derived)* | `Status` | HTTP >= 400 → "Failed", else "Success" |
| *(derived)* | `ResourceType` | Fixed: `"Endpoint"` |
| *(auto)* | `AuditId` | `Guid.NewGuid()` |

### Retention Policy (AuditRetentionService — TASK-050)

| Severity (mapped from RiskLevel) | Retention (days) | ~Duration |
|----------------------------------|-----------------|-----------|
| Critical | 2555 | 7 years |
| Error (High) | 1095 | 3 years |
| Warning (Medium) | 365 | 1 year |
| Info (Low) | 90 | 90 days |

---

## Sprint 5: Compliance & Handoff (Mar 17-21, 2026)

### Work Items Summary

| ID | Task | Story | Status | Assignee | Effort | Priority |
|----|------|-------|--------|----------|--------|----------|
| TASK-053 | Update `docs/IIS_DEPLOYMENT_RUNBOOK.md` (BitLocker + NTFS ACL + retire logs/) | Story 4 | ⏳ Ready | expert-myinvois-compliance | 2h | P0 |
| TASK-054 | Define backup runbook for `audit.db` (robocopy + restore procedure) | Story 4 | ⏳ Ready | Ops Lead | 2h | P0 |
| TASK-055 | Post-migration validation (3 M3 endpoint calls → verify audit.db rows + retention) | Story 4 | ⏳ Ready | developer-dotnet | 2h | P1 |
| TASK-056 | Update `initiative.md` — Phase 2 delivered items | Story 4 | ⏳ Ready | architect-system-design | 1h | P2 |
| **Total** | | | | | **7h** | |