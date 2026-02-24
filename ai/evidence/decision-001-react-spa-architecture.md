# Decision Log 001: Adopt React SPA Architecture

**Date**: February 4, 2026 (Updated: February 9, 2026)  
**Decision Maker**: IT Manager (via Architecture Review)  
**Status**: Approved  
**Impact Level**: HIGH (Major architectural change)

---

## Decision Statement

**We have decided to adopt React 18 + shadcn/ui + Tailwind CSS Single Page Application (SPA) architecture for MOVEX-Portal instead of the initially planned ASP.NET Core Razor Pages approach.**

**Update (Feb 5, 2026)**: Changed UI library from Material-UI to shadcn/ui for better modern aesthetics and lighter bundle size. See [Change Impact 002](change-impact-002-shadcn-ui-adoption.md) for details.

---

## Context

### Original Plan
- **Frontend**: ASP.NET Core 8.0 Razor Pages
- **UI Framework**: Bootstrap 5.3
- **Interactivity**: jQuery (minimal)
- **Rendering**: Server-side rendering (SSR)

### User Requirements (Reevaluation Trigger)
- "Very flashy, scalable, robust, secure and maintainable"
- Professional look and feel
- Modern UX/UI comparable to commercial SaaS products
- Improved Mermaid diagrams (better architectural visualization)

### Business Drivers
1. **User Experience**: Need polished, responsive interface for internal users
2. **Scalability**: Future mobile app and admin dashboard planned
3. **Team Growth**: Frontend team expected to scale independently
4. **Maintainability**: Separation of concerns for easier long-term evolution

---

## Decision

### Chosen Architecture: React 18 + shadcn/ui + Tailwind CSS SPA

**Frontend Stack:**
- React 18 (component-based UI)
- TypeScript 5 (type safety)
- shadcn/ui (accessible component library built on Radix UI)
- Tailwind CSS 3.4+ (utility-first CSS framework)
- Zustand or Redux Toolkit (global state management)
- TanStack Query (server state caching)
- React Router v6 (client-side routing)
- Axios (HTTP client)
- Vite (build tool)

**Backend Stack (Unchanged):**
- ASP.NET Core 8.0 (RESTful JSON API)
- Same RBAC middleware
- Same audit logging framework
- Same Windows AD authentication (JWT tokens)

---

## Alternatives Considered

### Option 1: Razor Pages + Bootstrap (Original Plan)
**Pros:**
- Same language across stack (.NET/C#)
- Simpler deployment (single app)
- No need for separate frontend team

**Cons:**
- Limited UI customization without heavy JavaScript
- Page-based navigation (slower UX)
- Harder to create "flashy" interfaces
- Difficult to scale frontend team independently
- Generic Bootstrap appearance

**Verdict**: ❌ Rejected - Insufficient for "flashy, professional" requirement

---

### Option 2: Blazor WebAssembly
**Pros:**
- C# across entire stack
- Component-based like React
- Strong typing with C#
- Microsoft ecosystem alignment

**Cons:**
- Smaller ecosystem (limited component libraries)
- Larger initial download (5-10MB vs React 200KB)
- Fewer developers available in market
- Limited Material Design component libraries
- WebAssembly performance overhead

**Verdict**: ❌ Rejected - Smaller ecosystem, larger bundle size

---

### Option 3: Vue.js + Vuetify
**Pros:**
- Simpler learning curve than React
- Good component library (Vuetify)
- Strong community

**Cons:**
- Smaller ecosystem than React (20k vs 90k npm packages)
- Less corporate adoption
- Smaller talent pool
- Vuetify less polished than Material-UI

**Verdict**: ❌ Rejected - Smaller ecosystem and talent pool

---

### Option 4: React 18 + shadcn/ui + Tailwind CSS (CHOSEN)
**Pros:**
- ✅ **Most modern UI** (2026 design trends, not generic Material Design)
- ✅ **Lightweight** (~95KB bundle vs Material-UI's ~280KB)
- ✅ **Maximum customization** (you own the component code)
- ✅ **Best developer experience** (React DevTools, hot reload, TypeScript support)
- ✅ **Independent scaling** (frontend/backend teams)
- ✅ **Trending technology** (Vercel, modern startups)
- ✅ **Future-proof** (mobile app, admin dashboard reuse same API)
- ✅ **Radix UI accessibility** (WCAG AAA compliant primitives)

**Cons:**
- Learning curve for .NET developers
- Need separate build process
- Slightly more complex deployment (2 artifacts)
- Fewer pre-built components than Material-UI

**Verdict**: ✅ **SELECTED** - Best for "flashy" modern UX with maximum flexibility

**Note**: Originally considered Material-UI, but shadcn/ui better meets "very flashy" requirement with more contemporary design and better performance.

---

## Comparison Matrix

| Criterion | Razor Pages | React | Blazor | Vue |
|-----------|-------------|-------|--------|-----|
| **UX/UI Quality** | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Developer Experience** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Ecosystem Size** | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |
| **Component Libraries** | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ |
| **Performance** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Scalability** | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Security** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Team Learning Curve** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Deployment Complexity** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Maintainability** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Future Mobile Support** | ⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ |
| **TOTAL** | **30/55** | **51/55** | **37/55** | **44/55** |

**Winner**: React 18 + shadcn/ui + Tailwind CSS (93% score)

---

## Consequences

### Positive
- ✅ Modern, professional UI that meets "flashy" requirement
- ✅ shadcn/ui provides a polished, modern aesthetic with lighter bundle size
- ✅ Better separation of concerns (frontend/backend)
- ✅ Frontend team can scale independently
- ✅ Future mobile app reuses same API
- ✅ Faster page navigation (SPA vs full page reloads)
- ✅ Better caching with TanStack Query (improved performance)
- ✅ Larger talent pool for hiring

### Negative
- ⚠️ Learning curve for .NET-focused team
- ⚠️ Need separate build pipeline (Vite for frontend, dotnet for backend)
- ⚠️ Slightly more complex deployment (2 artifacts instead of 1)
- ⚠️ Initial setup time (~2 weeks for React project)

### Neutral
- 🔄 Security level equivalent (JWT instead of session cookies)
- 🔄 Same RBAC and audit logging implementation
- 🔄 Same Windows AD authentication
- 🔄 Deployment still on IIS (same infrastructure)

---

## Implementation Plan

### Phase 1A: API Backend (4 weeks) - PARALLEL
- Implement ASP.NET Core 8.0 RESTful API
- JWT authentication middleware
- RBAC enforcement middleware
- Audit logging middleware
- OpenAPI/Swagger documentation
- Endpoint registry implementation

### Phase 1B: React Frontend (2 weeks setup + 2 weeks MVP) - PARALLEL
- Initialize React 18 + TypeScript project with Vite
- Configure shadcn/ui theme (SRX brand colors)
- Setup Redux Toolkit store structure
- Implement authentication flow (JWT)
- Create reusable component library
- Build MVP features (endpoint list, dynamic form, results display)

### Phase 1C: Integration (2 weeks)
- Connect React frontend to ASP.NET API
- End-to-end testing
- Performance optimization
- Security hardening
- User acceptance testing

**Total Timeline**: 6-8 weeks to production-ready MVP

---

## Security Equivalence

### Razor Pages (Session-Based)
```
1. User authenticates with Windows AD
2. Server creates session with authentication cookie
3. Session stored in server memory
4. Each request validated against session store
5. RBAC checked on every page load
```

### React SPA (Token-Based)
```
1. User authenticates with Windows AD
2. Server issues JWT token (signed, time-limited)
3. Token stored in memory (not localStorage for security)
4. Each API request includes JWT in Authorization header
5. RBAC checked on every API call via middleware
```

**Audit Logging**: Identical implementation (same middleware captures all requests)

**Network Security**: Identical (TLS 1.3, HSTS, CORS configured)

**Input Validation**: Enhanced (client-side + server-side vs server-side only)

---

## References

### Internal Documentation
- [System Architecture](../memory/02-system-architecture.md)
- [Technology Stack](../memory/03-technology-stack.md)
- [Deployment Guide](../memory/04-deployment-guide.md)

### External References
- [React Documentation](https://react.dev/)
- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [TanStack Query](https://tanstack.com/query/latest)
- [ASP.NET Core Web API](https://learn.microsoft.com/en-us/aspnet/core/web-api/)

---

## Approval Workflow

- [x] **IT Manager** - Review technical approach
- [x] **Security Team** - Validate security equivalence
- [x] **Development Team** - Confirm technical feasibility
- [x] **Operations Team** - Approve deployment approach
- [x] **Final Approval** - Proceed with Phase 1B

---

## Notes

This decision represents a strategic investment in long-term maintainability and user experience. While it adds short-term complexity (learning React, separate build process), the benefits in UX quality, team scalability, and future extensibility justify the approach.

The React ecosystem's maturity (10+ years), combined with Material-UI's professional design system, provides the fastest path to a "flashy, professional" interface that meets modern user expectations.

---

**Last Updated**: February 4, 2026  
**Next Review**: After Phase 1 completion (Q2 2026)
