# Decision Log 002: Keep MOVEX-Portal API Separate

**Date**: 2026-02-09  
**Decision Maker**: IT Manager (via Architecture Review)  
**Status**: Approved  
**Impact Level**: MEDIUM  

---

## Decision Statement

**We will keep the MOVEX-Portal API as a separate service that calls the existing `movex-rest-api`, rather than merging portal orchestration into the integration service.**

---

## Context

- `movex-rest-api` already exists as the M3 integration layer.
- MOVEX‑Portal requires RBAC, audit logging, endpoint registry, and UI‑driven orchestration.
- We need strong separation of security/compliance controls from raw integration logic.

---

## Options Considered

### Option A — Separate Portal API (Selected)
**Pros:**
- Clear separation of concerns (security + orchestration vs integration)
- Stronger compliance boundary for audit/RBAC
- Stable integration layer, independent UI evolution
- Supports multiple clients (portal, mobile, admin)
- Easier long‑term scaling and governance

**Cons:**
- Two deployments instead of one
- Additional service configuration

### Option B — Merge into `movex-rest-api`
**Pros:**
- Single deployment artifact
- Simpler operational footprint

**Cons:**
- Mixed concerns (integration + UI orchestration)
- Harder change control for compliance features
- Higher risk when UI changes impact integration layer

---

## Decision Outcome

**Selected: Option A — Separate Portal API**

---

## Implications

- React SPA → MOVEX‑Portal API → movex‑rest‑api
- RBAC/audit/endpoint registry remain in portal API
- movex‑rest‑api remains integration‑only

---

## Related Evidence

- `ai/evidence/decision-001-react-spa-architecture.md`
- `ai/evidence/change-impact-003-skills-registry-and-stubs.md`

---

**Approved By**: IT Manager  
**Next Review**: After MVP (Q2 2026)
