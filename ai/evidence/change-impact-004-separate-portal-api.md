# Change Impact 004: Separate MOVEX-Portal API

**Date**: 2026-02-09  
**Impact Level**: MEDIUM  
**Status**: Completed  

---

## Summary

Recorded and reflected the decision to keep the **MOVEX-Portal API** separate from **movex-rest-api**. Updated architecture documentation and diagrams to make the separation explicit.

---

## Files Updated

- `ai/memory/04-governance-and-decisions.md` (Decision-002 recorded)
- `ai/memory/02-system-architecture.md` (Portal API separation clarified)
- `docs/diagrams/architecture.md` (API label updated)
- `docs/diagrams/data-flow.md` (Portal API label updated)
- `docs/diagrams/deployment-topology.md` (Portal API labeled on SRXWEBAPP1)
- `README.md` (Evidence list updated)
- `ai/evidence/change-impact.md` (index updated)

---

## Impact Assessment

- **No runtime impact** (documentation change only)
- **Clarifies service boundaries** for governance and deployment
- **Improves compliance traceability** (explicit separation of concerns)

---

## Next Steps

- Ensure implementation keeps Portal API and movex-rest-api as separate deployments
- Update integration contracts if endpoints are adjusted
