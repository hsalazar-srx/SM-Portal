# Initiative: MOVEX-Portal MVP (Phase 1)

**Date**: 2026-02-09  
**Owner**: IT Manager  
**Status**: Draft  

## 🎯 Objective

Deliver a secure, config-driven portal for internal users to execute M3 MOVEX endpoints with RBAC and audit logging.

## ✅ Success Criteria

- MVP endpoint (MMS175) available in portal
- RBAC enforced for every execution
- Audit log stored in SQLite (per-project file — see decision-005; SQL Server dependency removed)
- UI reflects shadcn/ui + Tailwind CSS design

## 📦 Scope (Phase 1)

**In Scope**:
- React SPA UI shell
- Endpoint registry loader
- Generic endpoint executor
- RBAC middleware
- Audit logging middleware

**Out of Scope**:
- Approval workflows
- Batch operations
- Advanced dashboards

## 🔗 Dependencies

- Decision-001 approval ✅ (React SPA architecture)
- Integration contract finalization ✅
- SQLite audit schema (replacing SQL Server — Phase 2)

## ⚠️ Risks

- Legacy M3 constraints
- AD group mapping drift
- Audit log growth (mitigated: AuditRetentionService in Phase 2)

## 🧾 Evidence

- `ai/evidence/decision-001-react-spa-architecture.md`
- `ai/evidence/change-impact-002-shadcn-ui-adoption.md`
- `ai/evidence/decision-005-sqlite-audit-storage.md` *(Phase 2 — to be created Sprint 3)*

---

## Phase 2: Audit Storage Migration (SQLite)

**Start:** March 4, 2026
**Sprints:** 3 (ADR), 4 (Implementation), 5 (Compliance)

### Phase 2 Objective
Replace JSONL flat file audit logging with SQLite via EF Core, making the audit store queryable, enforcing retention policies actively, and aligning with the workspace audit standard for IIS-hosted services.

### Phase 2 Scope

**In Scope:**
- Replace `AuditService.cs` (StreamWriter/JSONL) with EF Core + SQLite
- Preserve `IAuditService.LogAsync()` interface (zero consumer impact)
- Implement `AuditRetentionService` (daily cleanup, currently config-only)
- WAL mode, NTFS ACL, BitLocker documentation
- Backup runbook for `audit.db`

**Out of Scope:**
- Centralized shared audit DB with MyInvois-Service (rejected — see decision-005 topology section; MyInvois runs independently as scheduled batch; schemas incompatible)
- Future centralization: re-evaluate if SM-Portal becomes an API gateway for all backend services
- Changes to RBAC, endpoint registry, or any frontend components

### Phase 2 Success Criteria
- [ ] `audit.db` replacing JSONL for all audit events
- [ ] All existing tests passing with SQLite backend
- [ ] `AuditRetentionService` actively enforcing retention policy
- [ ] `./logs/audit-log.jsonl` no longer written to
- [ ] Architecture Review sign-off obtained
- [ ] Deployment docs updated (BitLocker + backup runbook)

### Phase 2 Evidence
- `ai/evidence/decision-005-sqlite-audit-storage.md` (to be created Sprint 3)
- `ai/evidence/decision-log.md` (Architecture Review entry)
