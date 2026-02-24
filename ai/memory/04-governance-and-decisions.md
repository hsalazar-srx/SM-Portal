# MOVEX-Portal - Governance & Decisions

**Last Updated**: 2026-02-09  
**Status**: Draft  
**Owner**: IT Manager  

## 🧭 Governance Principles

1. **Change Control** - All production-impacting changes require approval
2. **Evidence First** - Decisions and change impacts logged in `ai/evidence/`
3. **Skills-Based Architecture** - Implementations must follow centralized skills
4. **Separation of IT/OT** - No direct impact to OT systems without review
5. **Auditability** - Every operational change must be traceable

---

## ✅ Decision Workflow

1. **Problem Identified** → Document context
2. **Options Evaluated** → Compare alternatives
3. **Decision Logged** → `ai/evidence/decision-###.md`
4. **Change Impact Logged** → `ai/evidence/change-impact-###.md`
5. **Approval** → IT Manager + Security
6. **Implementation** → Follow skills + update evidence
7. **Release Notes** → `ai/evidence/release-notes.md`

---

## 🧾 Current Decisions

| ID | Decision | Status | Evidence |
|----|---------|--------|----------|
| 001 | Adopt React SPA (shadcn/ui + Tailwind CSS) | Proposed | `ai/evidence/decision-001-react-spa-architecture.md` |
| 002 | Keep MOVEX-Portal API separate from movex-rest-api | Approved | `ai/evidence/decision-002-separate-portal-api.md` |

---

## ✅ Approval Matrix

| Change Type | Approver(s) | Notes |
|-------------|-------------|-------|
| UI stack changes | IT Manager | Requires updated evidence + change impact |
| API contract changes | IT Manager + Integration Team | Must update integration contracts |
| RBAC changes | IT Manager + Security | Must update risk-level mapping |
| Audit schema changes | Security + Data Platform | Must update retention policy |
| Production deployment | IT Manager + Operations | Schedule downtime window |

---

## 📦 Evidence Locations

- **Decision Logs**: `ai/evidence/decision-*.md`
- **Change Impact**: `ai/evidence/change-impact-*.md`
- **Release Notes**: `ai/evidence/release-notes.md`

---

## 📅 Review Cadence

- **Weekly**: Review open decisions + risks
- **Monthly**: Update roadmap and standards
- **Quarterly**: Full governance review

---

## ✅ Next Steps

1. Finalize Decision-001 approval
2. Communicate Decision-002 in architecture diagrams
3. Define release versioning scheme (v0.1.0 → v0.2.0)
4. Populate release notes template

---

**Related Files**: `ai/rules.md`, `ai/memory/05-standards-security-quality.md`