# MOVEX-Portal - Directory Map

**Generated**: 2026-02-09  
**Purpose**: Quick navigation for developers and AI agents

## 📁 Complete Directory Structure

```
C:\Projects\MOVEX-Portal\
│
├── 📄 INDEX.md                      ← Start here! Project navigation hub
├── 📄 README.md                     ← Project overview and setup
├── 📄 QUICK_REFERENCE.md            ← Quick commands and tips
├── 📄 DIRECTORY_MAP.md              ← This file
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
├── 📁 src/                          ← MOVEX-Portal API (ASP.NET Core)
│   ├── 📁 Models/                   ← DTOs and domain models
│   ├── 📁 Services/                 ← Skill implementations
│   └── 📁 Middleware/               ← RBAC + audit middleware
│
├── 📁 config/                       ← Runtime configuration
│   ├── 📄 endpoint-registry.json
│   └── 📄 rbac-config.json
│
├── 📁 tests/                        ← Unit and integration tests
│   ├── 📄 EndpointRegistryProviderTests.cs
│   ├── 📄 EndpointDiscoveryServiceTests.cs
│   ├── 📄 RbacServiceTests.cs
│   ├── 📄 AuditServiceTests.cs
│   └── 📄 GenericEndpointExecutorTests.cs
│
├── 📁 docs/                         ← Documentation
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

### Source Code (`src/`)

All files in `src/` are **📋 Planned** for implementation in Q1 2026.

| Component | Purpose |
|-----------|---------|
| **Controllers** | HTTP endpoints for portal UI |
| **Services** | Business logic implementing centralized skills |
| **Middleware** | Request pipeline (RBAC, audit) |
| **Models** | DTOs and domain models |
| **Pages** | Deprecated (legacy UI) |
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
