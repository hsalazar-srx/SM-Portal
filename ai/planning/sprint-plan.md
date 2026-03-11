# Sprint Plan (Phase 1)

**Date**: 2026-02-09  
**Sprint Length**: 2 weeks  
**Status**: In Progress  

## ✅ Sprint 0 (Planning & Compliance)

**Goals**:
- Complete skills audit
- Fill all required template memory files
- Define integration contracts
- Finalize Decision-001 approval
- Create required diagrams

**Tasks**:
- [x] Create `ai/memory/00-skills-audit.md`
- [x] Finalize `ai/memory/03-integration-contracts.md`
- [x] Complete governance/standards/risk files
- [x] Populate `docs/diagrams/*`
- [x] Update README + INDEX references

## ✅ Sprint 1 (Backend Foundations)

**Goals**:
- ✅ RBAC middleware (complete)
- Audit logging middleware
- Endpoint registry loader ✅ (service scaffold)
- Endpoint discovery ✅ (service scaffold)
- Integration with movex-rest-api

## ✅ Sprint 2 (Frontend Foundations)

**Goals**:
- React SPA scaffold ✅
- shadcn/ui component library ✅
- Tailwind theme setup ✅
- Basic endpoint list UI (next)

**Tasks**:
- [x] Initialize Vite + React + TypeScript
- [x] Configure Tailwind with design tokens
- [x] Implement Button component (primary/secondary/tertiary/destructive)
- [x] Implement Card component with Scanfil header strip
- [x] Implement Alert component
- [x] Create App shell with header/footer
- [ ] Install dependencies and test dev server
- [ ] Create endpoint list view component
- [ ] Implement dynamic form rendering

---

**Notes**: Backend RBAC is now fully implemented and tested. Adjust based on Decision-001 approval timeline.

---

---

# Phase 2: Audit Storage Migration (SQLite)

**Initiative:** SM-P2 — SQLite Audit Storage Migration
**Start:** March 4, 2026
**Sprint Model:** 1-week sprints (continuing Sprint numbering from Phase 1)
**Linked Plan:** `C:\Users\hsalazar\.claude\plans\harmonic-napping-hollerith.md`
**MAS Agents:** `architect-system-design`, `developer-dotnet`, `expert-myinvois-compliance`
**Cross-project:** Parallel with MyInvois-Service Sprints 5–7 (see `c:\Projects\MyInvois-Service\ai\planning\sprint-plan.md`)

---

## ⏳ Sprint 3: ADR & Architecture Review (Mar 4-7)

**Goals**:
- Document the SQLite audit decision for SM-Portal (migrating from JSONL → SQLite)
- Capture the centralized-vs-per-service audit topology decision with full reasoning
- Update all project AI context files to reflect the new architecture
- Obtain Architecture Review sign-off before any code changes

**Context**: SM-Portal currently uses JSONL flat files for audit logging (`./logs/audit-log.jsonl`). This is not queryable, retention is config-only (not enforced), and it has no structured duplicate detection. SQLite solves all three. The decision to keep SM-Portal's audit DB **separate** from MyInvois-Service was considered and documented (see TASK-040 reasoning).

**Tasks**:
- [ ] TASK-040: Create `ai/evidence/decision-005-sqlite-audit-storage.md`
  - **Decision:** Replace JSONL with SQLite via EF Core (`Microsoft.Data.Sqlite 8.0.*`)
  - **Topology decision (document fully):** Separate `audit.db` per service, NOT centralized
    - Considered: one shared DB in SM-Portal for all services
    - Rejected because: MyInvois-Service is an independent scheduled batch (not user-triggered through SM-Portal); its audit is a LHDN regulatory compliance record (7-year flat); schema is 45 columns with UBL-specific fields; MyInvois must audit even when SM-Portal is unavailable; write contention risk if shared file
    - Future note: if SM-Portal becomes an API gateway proxying all service calls synchronously, centralized audit could be revisited
  - **Options considered:** SQL Server (added dependency), JSONL retained (not queryable), shared SQLite file (write contention, coupling), SQLite per-project (chosen)
  - **Consequences:** Retention enforcement now active; sensitive masking preserved; NTFS ACL required on `./data/audit.db`
  - **Links to:** Sprint 4 tasks (TASK-044 to TASK-052)
- [ ] TASK-041: Update `ai/memory/04-governance-and-decisions.md`
  - Add: decision-005 reference, rationale (JSONL → SQLite upgrade), topology reasoning, Architecture Review status
- [ ] TASK-042: Update `ai/memory/02-system-architecture.md`
  - Update: Audit Storage section — replace JSONL with SQLite
  - Update: `AuditService` — now uses `AuditDbContext` (EF Core) instead of `StreamWriter`
  - Update: Program.cs DI section — add `AuditDbContext` + `AuditRetentionService` registration
  - Note: SM-Portal audit DB is intentionally separate from MyInvois-Service (reasons in decision-005)
- [ ] TASK-043: Architecture Review sign-off recorded in `ai/evidence/decision-log.md`
  - Confirm: topology decision (separate DBs) reviewed and approved
  - Confirm: centralized approach considered and reasoning documented

**Success Criteria**:
- [ ] `ai/evidence/decision-005-sqlite-audit-storage.md` created with topology reasoning
- [ ] `ai/memory/04-governance-and-decisions.md` updated
- [ ] `ai/memory/02-system-architecture.md` updated (JSONL → SQLite)
- [ ] Architecture Review sign-off in `ai/evidence/decision-log.md`
- [ ] No code changes this sprint

---

## ⏳ Sprint 4: SQLite Implementation (Mar 10-14)

**Goals**:
- Replace JSONL audit service with EF Core + SQLite
- Align SM-Portal audit schema with the shared workspace audit model
- Implement active retention enforcement (currently config-only)
- All existing tests must pass with SQLite backend

**Tasks**:
- [ ] TASK-044: Add NuGet packages to `MovexPortal.csproj`
  - Add: `Microsoft.Data.Sqlite 8.0.*`, `Microsoft.EntityFrameworkCore.Sqlite 8.0.*`, `Microsoft.EntityFrameworkCore.Design 8.0.*`
- [ ] TASK-045: Create `src/Data/AuditLogEntity.cs`
  - Map shared audit columns (UserId, Action, Category, Severity, ResourceType, ResourceId, Status, Timestamp, RequestPayload)
  - `eventType` → `Action`, `userId` → `UserId`, `resourceId` → `ResourceId`
  - `riskLevel` → `Severity` (Low→Info, Medium→Warning, High→Error, Critical→Critical)
  - Category fixed to `"SM-Portal"`, ResourceType fixed to `"Endpoint"`, Status derived from HTTP status code
- [ ] TASK-046: Create `src/Data/AuditDbContext.cs` + `AuditDbContextFactory.cs`
  - DbSet<AuditLogEntity>, OnModelCreating with CHECK constraints, WAL mode PRAGMA on startup
- [ ] TASK-046b: Generate EF Core initial migration (`dotnet ef migrations add InitialCreate --project src`)
- [ ] TASK-047: Rewrite `src/Services/AuditService.cs`
  - Replace `StreamWriter` / JSONL append with `AuditDbContext` EF Core insert
  - Keep `IAuditService.LogAsync()` interface unchanged (returns auditId GUID string)
  - Preserve sensitive field masking logic (password/token/secret/key → `***`)
  - Map `AuditEvent` fields to `AuditLogEntity` columns per plan
- [ ] TASK-048: Update `src/Program.cs`
  - Add: `services.AddDbContext<AuditDbContext>()` with SQLite connection string
  - Add: `services.AddHostedService<AuditRetentionService>()`
  - Add startup: `EnsureCreated()` + WAL mode PRAGMA
  - Remove: JSONL `Audit:LogPath` configuration wiring
- [ ] TASK-049: Update `src/appsettings.json` + `src/appsettings.Development.json`
  - Replace `Audit:LogPath` with `Audit:DatabasePath: "./data/audit.db"`
  - Keep `Audit:RetentionDays` section (now actively used by TASK-050)
- [ ] TASK-050: Implement `src/Services/AuditRetentionService.cs` (IHostedService)
  - Runs daily; deletes rows where `Timestamp < UtcNow - retentionDays[Severity]`
  - After deletion: `PRAGMA wal_checkpoint(TRUNCATE)` + `PRAGMA optimize`
  - Register in `Program.cs`
- [ ] TASK-051: Update `tests/AuditServiceTests.cs`
  - Replace temp-file JSONL with in-memory SQLite (`Data Source=:memory:`)
  - Verify: row inserted, auditId returned, sensitive masking still works
- [ ] TASK-052: Full build + test run + code review
  - `dotnet build` — 0 errors, 0 warnings; `dotnet test` — all tests passing

**Success Criteria**:
- [ ] `IAuditService.LogAsync()` interface unchanged (auditId GUID returned)
- [ ] Sensitive field masking preserved
- [ ] `AuditRetentionService` runs without error
- [ ] `audit.db` created in `./data/` on first run
- [ ] All tests passing (100%)
- [ ] `./logs/audit-log.jsonl` no longer written to

---

## ⏳ Sprint 5: Compliance & Handoff (Mar 17-21)

**Goals**:
- Complete compliance documentation, backup runbook, and post-migration validation
- Close out Phase 2 for SM-Portal

**Tasks**:
- [ ] TASK-053: Update `docs/IIS_DEPLOYMENT_RUNBOOK.md`
  - Add: BitLocker requirement (IIS server volume must be encrypted)
  - Add: NTFS ACL setup for `./data/audit.db` (App Pool identity only)
  - Add: note that `./logs/` folder is no longer used (JSONL retired)
- [ ] TASK-054: Define backup runbook for `audit.db`
  - Robocopy to backup share, daily via Windows Task Scheduler
  - Restore procedure: documented and tested
- [ ] TASK-055: Post-migration validation in test environment
  - Deploy to IIS test instance; execute 3 M3 endpoint calls
  - Verify rows in `audit.db` via DB Browser for SQLite
  - Trigger retention service manually; confirm old rows removed
- [ ] TASK-056: Update `initiative.md` — Phase 2 delivered items

**Success Criteria**:
- [ ] `docs/IIS_DEPLOYMENT_RUNBOOK.md` updated with BitLocker + NTFS ACL
- [ ] Backup runbook documented and tested
- [ ] Post-migration validation: 3 rows confirmed in `audit.db`
- [ ] Retention service: manual trigger confirms deletions work
- [ ] Phase 2 close-out complete