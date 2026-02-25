# SM-Portal (Scanfil Melbourne Portal) - Directory Map

**Generated**: 2026-02-25  
**Purpose**: Quick navigation for developers and AI agents  
**Last Update**: Frontend implementation complete (Feb 25, 2026)

## 📁 Complete Directory Structure

```
C:\Projects\MOVEX-Portal\  # (Folder may be renamed to SM-Portal)
│
├── 📄 INDEX.md                      ← Start here! Project navigation hub
├── 📄 README.md                     ← Project overview and setup
├── 📄 QUICK_REFERENCE.md            ← Quick commands and tips
├── 📄 DIRECTORY_MAP.md              ← This file
│
├── 📁 frontend/                     ← React 18 + TypeScript UI ✅ COMPLETE
│   ├── 📄 package.json              ← Dependencies (React, Tailwind, Vite, Router)
│   ├── 📄 tailwind.config.ts        ← Tailwind theme with custom design tokens
│   ├── 📄 vite.config.ts            ← Vite build configuration
│   │
│   ├── 📁 src/
│   │   ├── 📄 main.tsx              ← Entry point (BrowserRouter wrapper)
│   │   ├── 📄 App.tsx               ← React Router setup + protected routes
│   │   ├── 📄 index.css             ← Global styles (imports tokens.css)
│   │   │
│   │   ├── 📁 components/
│   │   │   ├── 📁 ui/               ← Reusable UI components
│   │   │   │   ├── 📄 input.tsx     ← Input, Textarea, Select with validation
│   │   │   │   ├── 📄 button.tsx    ← Button (4 variants)
│   │   │   │   ├── 📄 badge.tsx     ← Badge, BadgeGroup (6 variants)
│   │   │   │   ├── 📄 tabs.tsx      ← Tab system (context-based)
│   │   │   │   ├── 📄 spinner.tsx   ← Spinner, LoadingState, Skeleton
│   │   │   │   ├── 📄 stats.tsx     ← StatsCard, StatsGrid
│   │   │   │   ├── 📄 card.tsx      ← Card, CardHeaderStrip, CardBody
│   │   │   │   ├── 📄 drawer.tsx    ← Drawer, DrawerContent, DrawerHeader (mobile nav)
│   │   │   │   ├── 📄 alert.tsx     ← Alert component
│   │   │   │   └── 📄 typography.tsx ← H1-H3, Display, Body, Caption, Code
│   │   │   │
│   │   │   └── 📄 ResponsiveHeader.tsx ← Smart header (hamburger mobile + nav desktop)
│   │   │
│   │   ├── 📁 pages/
│   │   │   ├── 📄 SignIn.tsx        ← Windows AD auth page
│   │   │   ├── 📄 WelcomePage.tsx   ← Home: role-based feature cards
│   │   │   └── 📄 ComponentShowcase.tsx ← Interactive component demo (/components route)
│   │   │
│   │   ├── 📁 context/
│   │   │   └── 📄 AuthContext.tsx   ← User auth state (Context API)
│   │   │
│   │   └── 📁 styles/
│   │       ├── 📄 tokens.css        ← Design tokens (colors, spacing, typography, transitions)
│   │       └── 📄 index.css         ← Global imports
│   │
│   ├── 📁 public/                   ← Static assets
│   └── 📁 dist/                     ← Built output (generated)
│
├── 📁 ai/                           ← AI agent context and guidelines
│   ├── 📄 rules.md                  ← Development rules for AI agents
│   │
│   ├── 📁 memory/                   ← Long-term knowledge base
│   │   ├── 📄 00-product-vision.md
│   │   ├── 📄 00-skills-audit.md
│   │   ├── 📄 01-manufacturing-context.md
│   │   ├── 📄 02-system-architecture.md
│   │   ├── 📄 03-integration-contracts.md
│   │   ├── 📄 03-technology-stack.md
│   │   ├── 📄 04-deployment-guide.md
│   │   ├── 📄 04-governance-and-decisions.md
│   │   ├── 📄 05-standards-security-quality.md
│   │   ├── 📄 06-known-risks-and-pitfalls.md
│   │   └── 📄 07-product-roadmap.md
│   │
│   ├── 📁 planning/                 ← Sprint and initiative planning
│   │   ├── 📄 initiative.md
│   │   ├── 📄 execution-plan.md
│   │   └── 📄 sprint-plan.md
│   │
│   ├── 📁 tasks/                    ← Task tracking
│   │   ├── 📄 sprint-backlog.md
│   │   └── 📄 task-template.md
│   │
│   └── 📁 evidence/                 ← Decision logs and change impact
│       ├── 📄 decision-log.md
│       ├── 📄 change-impact.md
│       └── 📄 release-notes.md
│
├── 📁 src/                          ← MOVEX-Portal API (ASP.NET Core) 📋 PLANNED
│   ├── 📁 Models/                   ← DTOs and domain models
│   ├── 📁 Services/                 ← Skill implementations
│   └── 📁 Middleware/               ← RBAC + audit middleware
│
├── 📁 config/                       ← Runtime configuration 📋 PLANNED
│   ├── 📄 endpoint-registry.json
│   └── 📄 rbac-config.json
│
├── 📁 tests/                        ← Unit and integration tests 📋 PLANNED
│   ├── 📄 EndpointRegistryProviderTests.cs
│   ├── 📄 EndpointDiscoveryServiceTests.cs
│   ├── 📄 RbacServiceTests.cs
│   ├── 📄 AuditServiceTests.cs
│   └── 📄 GenericEndpointExecutorTests.cs
│
├── 📁 docs/                         ← Documentation
│   ├── 📄 FRONTEND_SETUP.md         ← Frontend development guide
│   └── 📁 diagrams/                 ← Mermaid architecture diagrams
│
├── 📁 .github/                      ← GitHub configuration (if using)
│   └── 📄 workflows/                ← CI/CD pipelines (TODO)
│
└── 📁 .githooks/                    ← Git hooks (optional)

```

## 📖 File Purpose Summary

### Root Level

| File | Purpose | Status |
|------|---------|--------|
| `INDEX.md` | Project navigation hub | ✓ Complete |
| `README.md` | Project overview and setup | ✓ Complete |
| `QUICK_REFERENCE.md` | Quick commands cheat sheet | ✓ Complete |
| `DIRECTORY_MAP.md` | This file | ✓ Complete |

### AI Context (`ai/`)

| File | Purpose | Status |
|------|---------|--------|
| `rules.md` | AI agent development guidelines | ✓ Complete |
| `memory/00-product-vision.md` | Goals, users, metrics, roadmap | ✓ Complete |
| `memory/01-manufacturing-context.md` | M3 MOVEX integration details | ✓ Complete |
| `memory/02-system-architecture.md` | Technical architecture | ✓ Complete |
| `planning/initiative.md` | Initiative overview | ✓ Complete |
| `tasks/sprint-backlog.md` | Current sprint tasks | ✓ Complete |
| `evidence/decision-log.md` | Architecture decisions | ✓ Complete |

### Frontend (`frontend/`)

| File | Purpose | Status |
|------|---------|--------|
| `package.json` | Dependencies & scripts | ✅ Complete |
| `tailwind.config.ts` | Theme with design tokens | ✅ Complete |
| `src/App.tsx` | React Router setup | ✅ Complete |
| `src/main.tsx` | Entry point | ✅ Complete |
| `src/components/ui/*` | Component library | ✅ Complete |
| `src/pages/SignIn.tsx` | Auth page | ✅ Complete |
| `src/pages/WelcomePage.tsx` | Home page | ✅ Complete |
| `src/pages/ComponentShowcase.tsx` | Component demo | ✅ Complete |
| `src/styles/tokens.css` | Design tokens | ✅ Complete |

### Backend Source Code (`src/`)

All files in `src/` (backend) are **📋 Planned** for implementation in Q1 2026.

| Component | Purpose |
|-----------|---------|
| **Controllers** | HTTP endpoints for portal UI |
| **Services** | Business logic implementing centralized skills |
| **Middleware** | Request pipeline (RBAC, audit) |
| **Models** | DTOs and domain models |
| **config** | JSON configuration files |

### Tests (`tests/`)

| Type | Purpose | Status |
|------|---------|--------|
| **Unit** | Service and model tests | 📋 Planned |
| **Integration** | End-to-end workflow tests | 📋 Planned |

### Documentation (`docs/`)

| File | Purpose | Status |
|------|---------|--------|
| `docs/diagrams/` | Mermaid architecture diagrams | ✓ Complete |

## 🔗 Related Directories

### External Dependencies

| Path | Purpose |
|------|---------|
| `C:\Projects\.github\skills\` | Centralized skills registry |
| `C:\Projects\MOVEX\API-Integration\movex-rest-api\` | Shared M3 API components |
| `C:\Projects\IT-Strategy\foundation\templates\srx-project-template\` | Project template |

### Skills Referenced

| Skill | Path |
|-------|------|
| **rbac-endpoint-control** | `C:\Projects\.github\skills\architecture\rbac-endpoint-control\skill.md` |
| **audit-logging-framework** | `C:\Projects\.github\skills\architecture\audit-logging-framework\skill.md` |
| **generic-endpoint-executor** | `C:\Projects\.github\skills\architecture\generic-endpoint-executor\skill.md` |
| **m3-transaction-builder** | `C:\Projects\.github\skills\integration\m3-transaction-builder\skill.md` |
| **m3-response-parser** | `C:\Projects\.github\skills\integration\m3-response-parser\skill.md` |

## 📊 Implementation Status

- ✅ **Complete**: File exists and is ready
- 📋 **Planned**: Documented but not yet created
- 🔄 **In Progress**: Being actively developed

### Current Status Summary

```
Total Files Planned: ~40
Complete: 8 (20%)
Planned: 32 (80%)
```

### Next Steps

1. Wire middleware into ASP.NET pipeline (Program.cs)
2. Implement RBAC role mapping to AD groups
3. Persist audit logs to SQL Server
4. Initialize React SPA (frontend/)

---

**Last Updated**: 2026-02-09  
**Project Status**: Pre-Alpha (Foundations in progress)
