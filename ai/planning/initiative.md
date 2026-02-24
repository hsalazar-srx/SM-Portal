# Initiative: MOVEX-Portal MVP (Phase 1)

**Date**: 2026-02-09  
**Owner**: IT Manager  
**Status**: Draft  

## 🎯 Objective

Deliver a secure, config-driven portal for internal users to execute M3 MOVEX endpoints with RBAC and audit logging.

## ✅ Success Criteria

- MVP endpoint (MMS175) available in portal
- RBAC enforced for every execution
- Audit log stored in SQL Server
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

- Decision-001 approval
- Integration contract finalization
- SQL Server audit schema

## ⚠️ Risks

- Legacy M3 constraints
- AD group mapping drift
- Audit log growth

## 🧾 Evidence

- `ai/evidence/decision-001-react-spa-architecture.md`
- `ai/evidence/change-impact-002-shadcn-ui-adoption.md`
