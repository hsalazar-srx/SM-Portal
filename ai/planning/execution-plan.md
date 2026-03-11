# Execution Plan - MOVEX-Portal Phase 1

**Date**: 2026-02-09
**Status**: Phase 1 Complete | Phase 2 In Progress
**Last Updated**: 2026-03-04

## 1. Preconditions

- Decision-001 approval ✅
- Skills audit complete ✅
- Integration contracts finalized ✅
- Style guide & palette approved ✅

## 2. Workstreams

### Backend (ASP.NET Core API)
- Implement RBAC middleware ✅
- Implement audit logging middleware ✅
- Build generic endpoint executor ✅ (logic scaffolded)
- Implement registry provider ✅
- Implement endpoint discovery ✅
- Integrate movex-rest-api client (pending)

### Frontend (React SPA)
- Initialize Vite + React + TypeScript ✅
- Configure Tailwind CSS ✅
- Add shadcn/ui components ✅
- Create endpoint list + form rendering (pending)

### Infrastructure
- Configure IIS app pool ✅
- ~~Setup SQL Server audit schema~~ → **Replaced by SQLite (see decision-005)**
- Configure AD authentication ✅

## 3. Milestones

- **M1**: Skills audit & compliance complete ✅
- **M2**: Backend API scaffolding complete ✅
- **M3**: Frontend UI scaffold complete ✅
- **M4**: MMS175 MVP integration ⏳

## 4. Evidence & Reporting

- Update `ai/evidence/decision-*.md` for major decisions
- Update `ai/evidence/change-impact-*.md` for impactful changes
- Add release notes for MVP

---

**Owner**: IT Manager

---

---

# Execution Plan — Phase 2: Audit Storage Migration (SQLite)

**Initiative:** SM-P2 — SQLite Audit Storage Migration
**Date**: 2026-03-04
**Status**: Sprint 3 (ADR) in progress
**Linked Plan:** `C:\Users\hsalazar\.claude\plans\harmonic-napping-hollerith.md` (Story 3)
**Sprint Backlog:** `ai/tasks/sprint-backlog.md` (Sprint 3–5, TASK-040–056)
**Cross-project:** Parallel with MyInvois-Service Phase 2 (Sprints 5–7)

---

## Phase 2 Preconditions

- Phase 1 complete (RBAC, audit middleware, frontend scaffold) ✅
- Architecture Review sign-off on decision-005 (Sprint 3 gate — no code before this)
- `ai/evidence/decision-005-sqlite-audit-storage.md` created and reviewed
- `ai/memory/` context files updated to reflect SQLite architecture

---

## Phase 2 Workstreams

### Workstream A: Architecture Decision & Context (Sprint 3 — Mar 4–7)

**Goal:** Document the SQLite decision and obtain Architecture Review sign-off before any implementation begins.

| Step | Task | File | Notes |
|------|------|------|-------|
| A1 | Create decision-005 ADR | `ai/evidence/decision-005-sqlite-audit-storage.md` | TASK-040 — covers topology reasoning (centralized vs per-service) |
| A2 | Update governance memory | `ai/memory/04-governance-and-decisions.md` | TASK-041 — add decision-005 reference and topology rationale |
| A3 | Update architecture memory | `ai/memory/02-system-architecture.md` | TASK-042 — replace JSONL with SQLite; update DI section |
| A4 | Record Architecture Review | `ai/evidence/decision-log.md` | TASK-043 — sign-off entry before Sprint 4 begins |

**Gate:** No code changes until Architecture Review entry exists in `ai/evidence/decision-log.md`.

**Topology decision (document in A1):**
- Considered: one shared audit DB in SM-Portal for all workspace services
- Rejected: MyInvois-Service is a scheduled batch (not triggered through SM-Portal); its audit is a LHDN regulatory compliance record; schemas are incompatible; MyInvois must audit even when SM-Portal is unavailable; shared SQLite file creates write contention
- Future note: if SM-Portal becomes a synchronous API gateway, centralized audit should be re-evaluated via a new ADR

---

### Workstream B: SQLite Implementation (Sprint 4 — Mar 10–14)

**Goal:** Replace JSONL flat file with EF Core + SQLite; align schema with workspace shared audit model; implement active retention enforcement.

#### B1 — NuGet Package Update (TASK-044)

Edit `src/MovexPortal.csproj`:
```xml
<!-- Add -->
<PackageReference Include="Microsoft.Data.Sqlite" Version="8.0.*" />
<PackageReference Include="Microsoft.EntityFrameworkCore.Sqlite" Version="8.0.*" />
<PackageReference Include="Microsoft.EntityFrameworkCore.Design" Version="8.0.*">
  <PrivateAssets>all</PrivateAssets>
  <IncludeAssets>runtime; build; native; contentfiles; analyzers</IncludeAssets>
</PackageReference>
```

#### B2 — AuditLogEntity (TASK-045)

Create `src/Data/AuditLogEntity.cs` mapping the shared workspace audit schema:

| C# Property | Column | Type | Notes |
|-------------|--------|------|-------|
| `AuditId` | `AuditId` | `TEXT` (Guid string) | PK, `Guid.NewGuid()` |
| `UserId` | `UserId` | `TEXT NOT NULL` | Windows identity |
| `Action` | `Action` | `TEXT NOT NULL` | From `AuditEvent.eventType` |
| `Category` | `Category` | `TEXT NOT NULL` | Fixed: `"SM-Portal"` |
| `Severity` | `Severity` | `TEXT NOT NULL` | Low→Info, Medium→Warning, High→Error, Critical→Critical |
| `ResourceType` | `ResourceType` | `TEXT NOT NULL` | Fixed: `"Endpoint"` |
| `ResourceId` | `ResourceId` | `TEXT NOT NULL` | From `AuditEvent.resourceId` (Program/Method path) |
| `Status` | `Status` | `TEXT NOT NULL` | HTTP ≥400 → `"Failed"`, else `"Success"` |
| `Timestamp` | `Timestamp` | `TEXT NOT NULL` | ISO 8601 UTC (`DateTime.UtcNow.ToString("O")`) |
| `RequestPayload` | `RequestPayload` | `TEXT` | `JsonSerializer.Serialize(AuditEvent.data)` |

CHECK constraints: `Status IN ('Success','Failed')`, `Severity IN ('Info','Warning','Error','Critical')`

#### B3 — AuditDbContext + Factory (TASK-046 / TASK-046b)

Create `src/Data/AuditDbContext.cs`:
- `DbSet<AuditLogEntity> AuditLogs`
- `OnModelCreating`: map table `AuditLog`, set PK, apply CHECK constraints, define indexes on `Timestamp`, `UserId`, `Action`, `Severity`
- Enable WAL mode on `DbContext.Database.OpenConnection()`

Create `src/Data/AuditDbContextFactory.cs` (IDesignTimeDbContextFactory for EF tooling).

Generate initial migration:
```
dotnet ef migrations add InitialCreate --project src
```

#### B4 — Rewrite AuditService (TASK-047)

Rewrite `src/Services/AuditService.cs`:
- Replace `StreamWriter` / JSONL append with `AuditDbContext` EF Core insert
- Keep `IAuditService.LogAsync()` interface **unchanged** (returns `auditId` GUID string)
- Preserve sensitive field masking (password/token/secret/key → `***`)
- Map `AuditEvent` fields to `AuditLogEntity` columns per B2 table above

```csharp
// Interface contract — MUST NOT CHANGE
public interface IAuditService
{
    Task<string> LogAsync(AuditEvent auditEvent, CancellationToken cancellationToken = default);
}
```

#### B5 — Program.cs DI Update (TASK-048)

Edit `src/Program.cs`:
```csharp
// Add
builder.Services.AddDbContext<AuditDbContext>(options =>
    options.UseSqlite(builder.Configuration["Audit:DatabasePath"]));
builder.Services.AddHostedService<AuditRetentionService>();

// Remove
// builder.Services.Configure<AuditOptions>(o => o.LogPath = ...)
```

On app startup, ensure `./data/` directory exists and call `EnsureCreated()` + WAL mode PRAGMA.

#### B6 — Configuration Changes (TASK-049)

Edit `src/appsettings.json`:
```json
"Audit": {
  "DatabasePath": "./data/audit.db",
  "RetentionDays": {
    "Critical": 2555,
    "Error": 1095,
    "Warning": 365,
    "Info": 90
  }
}
```

Edit `src/appsettings.Development.json`:
```json
"Audit": {
  "DatabasePath": "./data/audit-dev.db"
}
```

Remove `Audit:LogPath` from both files. `./logs/` folder is retired — no longer written to.

#### B7 — AuditRetentionService (TASK-050)

Create `src/Services/AuditRetentionService.cs` (IHostedService):
- Runs daily at midnight UTC
- Deletes rows where `Timestamp < UtcNow - retentionDays[Severity]`
- After deletion: `PRAGMA wal_checkpoint(TRUNCATE)` + `PRAGMA optimize`
- Reads retention config from `Audit:RetentionDays` section

Retention policy:

| Severity | Retention | Duration |
|----------|-----------|---------|
| Critical | 2555 days | 7 years |
| Error | 1095 days | 3 years |
| Warning | 365 days | 1 year |
| Info | 90 days | 90 days |

#### B8 — Update Tests (TASK-051 / TASK-052)

Edit `tests/AuditServiceTests.cs`:
- Replace temp-file JSONL setup with in-memory SQLite (`Data Source=:memory:`)
- Verify: row inserted, `auditId` GUID returned, sensitive masking still works (e.g., `password` → `***`)
- Build: `dotnet build` — 0 errors, 0 warnings
- Test: `dotnet test` — 100% passing

---

### Workstream C: Compliance & Handoff (Sprint 5 — Mar 17–21)

**Goal:** Complete security documentation, backup runbook, and post-migration validation.

| Step | Task | File | Notes |
|------|------|------|-------|
| C1 | Update IIS deployment runbook | `docs/IIS_DEPLOYMENT_RUNBOOK.md` | TASK-053 — BitLocker requirement + NTFS ACL setup for `./data/audit.db` + retire `./logs/` |
| C2 | Write backup runbook | `docs/BACKUP_RUNBOOK.md` | TASK-054 — robocopy to backup share, daily via Windows Task Scheduler, restore procedure |
| C3 | Post-migration validation | IIS test instance | TASK-055 — execute 3 M3 endpoint calls; verify rows in `audit.db`; trigger retention service |
| C4 | Update initiative.md | `ai/planning/initiative.md` | TASK-056 — mark Phase 2 delivered items |

**NTFS ACL (C1):**
```cmd
icacls "C:\inetpub\wwwroot\SM-Portal\data" /inheritance:r
icacls "C:\inetpub\wwwroot\SM-Portal\data" /grant "IIS AppPool\MovexPortal:(OI)(CI)F"
icacls "C:\inetpub\wwwroot\SM-Portal\data" /deny "Everyone:(OI)(CI)R"
```

**Backup runbook (C2):**
```cmd
robocopy "C:\inetpub\wwwroot\SM-Portal\data" "\\backup-server\sm-portal-audit" audit.db /Z /COPYALL /LOG:C:\logs\audit-backup.log
```
Schedule daily via Windows Task Scheduler at 02:00 (after WAL checkpoint).

---

## Phase 2 Milestones

| Milestone | Target | Success Criteria |
|-----------|--------|-----------------|
| **M5**: Architecture Review sign-off | Mar 7, 2026 | `decision-005` accepted; `decision-log.md` entry created |
| **M6**: SQLite implementation complete | Mar 14, 2026 | All tests passing; `audit.db` created; `audit-log.jsonl` retired |
| **M7**: Compliance sign-off | Mar 21, 2026 | BitLocker documented; backup runbook tested; 3 validation rows confirmed |

---

## Phase 2 Evidence & Reporting

- `ai/evidence/decision-005-sqlite-audit-storage.md` — ADR for SQLite migration + topology decision
- `ai/evidence/decision-log.md` — Architecture Review sign-off entry
- `ai/memory/02-system-architecture.md` — Updated to reflect SQLite audit storage
- `ai/memory/04-governance-and-decisions.md` — Updated with decision-005 reference
- `docs/IIS_DEPLOYMENT_RUNBOOK.md` — BitLocker + NTFS ACL additions
- `docs/BACKUP_RUNBOOK.md` — New backup and restore procedure

---

## Phase 2 Common Issues

| Issue | Cause | Resolution |
|-------|-------|-----------|
| `./data/audit.db` not created | Directory doesn't exist | Ensure startup code calls `Directory.CreateDirectory(Path.GetDirectoryName(dbPath))` |
| `IAuditService` consumer compilation error | Interface changed | `LogAsync()` signature must remain `Task<string>` — do not alter |
| Retention service deletes too aggressively | Config mapping wrong | Verify `Severity` column values match `Audit:RetentionDays` keys exactly (case-sensitive) |
| WAL file grows unbounded | `wal_checkpoint` not running | Confirm `AuditRetentionService` calls `PRAGMA wal_checkpoint(TRUNCATE)` after bulk deletes |
| `./logs/audit-log.jsonl` still being written | Old code path not removed | Search for `StreamWriter` / `audit-log.jsonl` references in `AuditService.cs` and `Program.cs` |

---

**Owner**: IT Manager
**Phase 2 Status**: Sprint 3 (ADR) in progress → Sprint 4 (Implementation) → Sprint 5 (Compliance)