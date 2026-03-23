# Decision 005: Frontend-Backend API Path Routing Strategy

**Date**: 2026-03-23
**Decision Maker**: Architecture Team
**Status**: Approved
**Impact Level**: MEDIUM

---

## Decision Statement

**We will manage the frontend-to-backend API base URL exclusively via environment configuration using `VITE_API_URL` (frontend) and `app.UsePathBase("/api")` (backend), never hardcoding the `/api` prefix in route attributes or service paths.**

---

## Context

SM-Portal frontend (React/Vite) and backend (.NET 8 ASP.NET Core) are deployed within a single IIS site structure:
- **Development**: Both run locally (Kestrel for backend, dev server for frontend)
- **UAT**: Deployed to IIS with backend in a virtual application at `/api`
- **Production**: Will migrate to subdomains (future planning phase)

**Problem**: Service file `exchangeRateService.ts` was hardcoding `/api/` in the path, causing duplicate `/api/api/...` in production routing (404 errors).

**Root Cause**: Confusion about where the `/api` prefix belongs — in environment config or in code paths.

---

## Options Considered

### Option A — Configuration-Only Path Prefix (Selected)
**Pattern:**
```typescript
const API_BASE = (import.meta as any).env.VITE_API_URL || 'http://localhost:5050';
fetch(`${API_BASE}/exchange-rates/...`)  // No /api in the path
```

**Pros:**
- ✓ Single source of truth (`VITE_API_URL` environment variable)
- ✓ No duplicated `/api` prefix
- ✓ Identical code works across dev/UAT/production
- ✓ Reversible for future subdomain migration (zero code changes)
- ✓ Aligns with existing `authService` and `invoiceService` patterns

**Cons:**
- Requires discipline — developers must not hardcode `/api` in paths

### Option B — Hardcode `/api` in Route Attributes
**Pattern:**
```csharp
[Route("api/[controller]")]  // /api is hardcoded
```

**Pros:**
- Self-documenting (route shows `/api` is needed)

**Cons:**
- ❌ Couples routes to deployment architecture
- ❌ Breaks if deployment path changes (must update code)
- ❌ Inconsistent with existing services

### Option C — Use IIS Rewrite Rules Only
**Pattern:**
- Manage `/api` prefix entirely in IIS URL Rewrite
- Backend routes have no `/api` prefix

**Pros:**
- Backend is unaware of path prefix

**Cons:**
- ❌ IIS-specific; doesn't work in Kestrel development
- ❌ Broken parity between dev and production
- ❌ Harder debugging when routing doesn't match

---

## Decision Outcome

**Selected: Option A — Configuration-Only Path Prefix**

**Implementation:**

### Frontend (.env.production)
```bash
VITE_API_URL=/api
```

### Frontend Service Files
```typescript
const API_BASE = (import.meta as any).env.VITE_API_URL || 'http://localhost:5050';
fetch(`${API_BASE}/exchange-rates/USD/2026-03-23`)
// In UAT: /api/exchange-rates/USD/2026-03-23
// (no duplicate /api)
```

### Backend (Program.cs)
```csharp
app.UsePathBase("/api");  // Strip /api, replicates IIS virtual directory behavior
```

### Backend Routes
```csharp
[ApiController]
[Route("[controller]")]  // ✓ Routes are /exchange-rates, /invoices, etc.
```

---

## Implementation

**Bug Fix Applied:**
- Fixed: `frontend/src/services/exchangeRateService.ts:30`
- Before: `${API_BASE}/api/exchange-rates/...`
- After: `${API_BASE}/exchange-rates/...`

**Validation:**
- Pattern matches existing `authService.ts` (uses `/auth/test`)
- Pattern matches existing `invoiceService.ts` (uses `/invoices`)
- Tested in dev (Kestrel + Vite proxy) ✓
- Ready for UAT (IIS virtual app) ✓

---

## Implications

1. **All service files** (`exchangeRateService`, `authService`, `invoiceService`, etc.) must follow the pattern: use `${API_BASE}` with no hardcoded `/api` prefix
2. **All controllers** must use `[Route("[controller]")]` — never `[Route("api/[controller]")]`
3. **Environment variables** are the single source of truth for API base URL
4. **Future flexibility**: Can migrate to subdomains (ADR-023) without code changes — only config changes needed

---

## Future Considerations

**Production Migration (Planned ADR):**
When production go-live occurs, this pattern enables seamless migration to subdomain routing:
```bash
# Future .env.production (subdomains)
VITE_API_URL=https://sm-portal-api.scanfil.local
```
No backend code changes required — only `UsePathBase("/api")` removal.

---

## Related Evidence

- `ai/memory/09-frontend-backend-api-routing.md` — Comprehensive routing guide
- `ai/memory/08-environment-configuration.md` — Environment setup reference
- Bug fix: `frontend/src/services/exchangeRateService.ts`

---

**Approved By**: Architecture Team
**Review Date**: 2026-09-23 (upon production planning phase)

