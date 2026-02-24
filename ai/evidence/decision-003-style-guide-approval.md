# Decision Log 003: Approve Style Guide & Palette

**Date**: 2026-02-09  
**Decision Maker**: IT Manager (via Architecture Review)  
**Status**: Approved  
**Impact Level**: MEDIUM  

---

## Decision Statement

**We approve `context/design/style-guide.md` as the authoritative theme and palette for the MOVEX-Portal frontend.**

---

## Context

- The style guide was derived from the provided brand imagery.
- Frontend scaffolding is planned (Vite + React + Tailwind + shadcn/ui).
- A single source of truth for tokens and component styling is required before UI work begins.

---

## Decision Outcome

- `context/design/style-guide.md` is the canonical source for design tokens and component recipes.
- All frontend scaffolding must map Tailwind and shadcn/ui to these tokens.
- Changes to the palette require a new change-impact record.

---

## Implications

- Theme tokens drive CSS variables, Tailwind config, and shadcn/ui theming.
- UI work proceeds only after token alignment is in place.
- Documentation will reference the style guide as the approved theme baseline.

---

## Related Evidence

- `ai/evidence/change-impact-006-style-guide-approval.md`
- `ai/evidence/decision-001-react-spa-architecture.md`

---

**Approved By**: IT Manager  
**Next Review**: After frontend MVP (Q2 2026)