# SM-Portal (Scanfil Melbourne Portal) - Project Index

**Version**: 0.2.0 (Frontend MVP)  
**Status**: ✅ Frontend Complete | 🚧 Backend Planned  
**Last Updated**: 2026-02-25  
**Frontend**: ✅ Design system, component library, mobile responsiveness

## 📍 Quick Navigation

| Section | Description | Link |
|---------|-------------|------|
| **README** | Project overview and setup | [README.md](README.md) |
| **Frontend Guide** | Component library, design system, responsive design | [frontend/README.md](frontend/README.md) |
| **Component Showcase** | Interactive demo page (run dev server, visit /components) | `localhost:5173/components` |
| **Product Vision** | Goals, users, roadmap | [ai/memory/00-product-vision.md](ai/memory/00-product-vision.md) |
| **Manufacturing Context** | M3 MOVEX integration details | [ai/memory/01-manufacturing-context.md](ai/memory/01-manufacturing-context.md) |
| **Style Guide** | Theme + palette (approved) | [context/design/style-guide.md](context/design/style-guide.md) |
| **AI Rules** | Agent guidelines and principles | [ai/rules.md](ai/rules.md) |
| **Skills Registry** | Centralized capabilities | `C:\Projects\.github\skills\` |

## 🎯 What Is SM-Portal?

Scanfil Melbourne Portal (SM-Portal) - a secure, user-friendly web portal that exposes selected M3 MOVEX API endpoints to internal users with:

- ✅ **Role-Based Access Control (RBAC)** - Windows AD integration
- ✅ **Audit Logging** - ISO 27001 compliance
- ✅ **Generic Executor** - Config-driven endpoint exposure (no hardcoding)
- ✅ **Dynamic UI** - Auto-generated forms from endpoint metadata

## 🏗️ Architecture

### Skills-Based Implementation

This project implements **centralized skills** from `C:\Projects\.github\skills\`:

| Skill | Category | Purpose | Status |
|-------|----------|---------|--------|
| **rbac-endpoint-control** | Architecture | RBAC enforcement | ⚙️ Scaffolded |
| **audit-logging-framework** | Architecture | ISO 27001 logging | ⚙️ Scaffolded |
| **generic-endpoint-executor** | Architecture | Config-driven execution | ⚙️ Scaffolded |
| **endpoint-registry-provider** | Architecture | Registry loading + validation | ⚙️ Scaffolded |
| **endpoint-discovery-service** | Architecture | Endpoint discovery + filtering | ⚙️ Scaffolded |
| **ui-ux-best-practices** | Architecture | Token-driven UI/UX standards | ✅ Registered |
| **m3-transaction-builder** | Integration | Build M3 transactions | ✓ Reused from REST API |
| **m3-response-parser** | Integration | Parse M3 responses | ✓ Reused from REST API |
| **inventory-operations** | Manufacturing | Stock workflows | ⏳ Future |

### Project Structure

```
MOVEX-Portal/
├── ai/                         ← AI agent context
│   ├── rules.md                ← Development guidelines
│   ├── memory/                 ← Long-term knowledge base
│   │   ├── 00-product-vision.md
│   │   ├── 00-skills-audit.md
│   │   ├── 01-manufacturing-context.md
│   │   ├── 02-system-architecture.md
│   │   ├── 03-integration-contracts.md
│   │   ├── 03-technology-stack.md
│   │   ├── 04-deployment-guide.md
│   │   ├── 04-governance-and-decisions.md
│   │   ├── 05-standards-security-quality.md
│   │   ├── 06-known-risks-and-pitfalls.md
│   │   └── 07-product-roadmap.md
│   ├── planning/               ← Sprint planning
│   │   ├── initiative.md
│   │   ├── sprint-plan.md
│   │   └── execution-plan.md
│   ├── tasks/                  ← Task tracking
│   │   ├── task-template.md
│   │   └── sprint-backlog.md
│   └── evidence/               ← Decision logs & change impact
│       ├── decision-log.md
│       ├── change-impact.md
│       └── release-notes.md
├── docs/                       ← Documentation
│   └── diagrams/               ← Architecture diagrams
│       ├── README.md
│       ├── architecture.md
│       ├── auth-flow.md
│       ├── deployment-topology.md
│       ├── data-flow.md
│       ├── integration-sequence.md
│       ├── workflow-process.md
│       └── decision-tree.md
├── src/                        ← Implementation (ASP.NET Core)
│   ├── Controllers/            ← HTTP endpoints
│   ├── Services/               ← Business logic (skill implementations)
│   ├── Middleware/             ← RBAC, audit, etc.
│   ├── Models/                 ← DTOs and domain models
├── config/                     ← Endpoint registry, RBAC config
├── frontend/                   ← React SPA (shadcn/ui + Tailwind) [Planned]
├── tests/                      ← Unit and integration tests
├── INDEX.md                    ← This file
└── README.md                   ← Project setup and overview
```

## 🚀 Getting Started

### Prerequisites

- .NET 8.0 SDK
- Access to M3 MOVEX (via movex-rest-api)
- Windows Server with IIS (for deployment)
- Active Directory (for authentication)

### Development Setup

```powershell
# Clone and navigate
cd C:\Projects\MOVEX-Portal

# (Implementation is underway - see Phase 1 plan)
```

### Dependencies

**Upstream**:
- `movex-rest-api` - Connection pool, transaction builder, response parser

**Downstream (New)**:
- MOVEX-Portal UI
- RBAC enforcement
- Audit logging

## 📖 Documentation

### AI Memory (Long-Term Context)

| File | Purpose | Status |
|------|---------|--------|
| [00-product-vision.md](ai/memory/00-product-vision.md) | Vision, users, metrics | ✓ Complete |
| [01-manufacturing-context.md](ai/memory/01-manufacturing-context.md) | M3 MOVEX integration | ✓ Complete |
| [02-system-architecture.md](ai/memory/02-system-architecture.md) | Technical architecture | ✓ Complete |
| [03-technology-stack.md](ai/memory/03-technology-stack.md) | Technology decisions | ✓ Complete |
| [04-deployment-guide.md](ai/memory/04-deployment-guide.md) | Deployment procedures | ✓ Complete |
| [03-integration-contracts.md](ai/memory/03-integration-contracts.md) | Integration contracts | ✓ Complete |
| [04-governance-and-decisions.md](ai/memory/04-governance-and-decisions.md) | Governance & decisions | ✓ Complete |
| [05-standards-security-quality.md](ai/memory/05-standards-security-quality.md) | Standards & security | ✓ Complete |
| [06-known-risks-and-pitfalls.md](ai/memory/06-known-risks-and-pitfalls.md) | Risk register | ✓ Complete |
| [07-product-roadmap.md](ai/memory/07-product-roadmap.md) | Product roadmap | ✓ Complete |

### Planning

| File | Purpose | Status |
|------|---------|--------|
| [initiative.md](ai/planning/initiative.md) | Initiative overview | ✓ Complete |
| [execution-plan.md](ai/planning/execution-plan.md) | Execution plan | ✓ Complete |
| [sprint-plan.md](ai/planning/sprint-plan.md) | Current sprint | ✓ Complete |

### Evidence

| File | Purpose | Status |
|------|---------|--------|
| [decision-log.md](ai/evidence/decision-log.md) | Architecture decisions | ✓ Complete |
| [change-impact.md](ai/evidence/change-impact.md) | Change analysis | ✓ Complete |
| [release-notes.md](ai/evidence/release-notes.md) | Version history | 📋 Planned |

## 🎯 Roadmap

### Phase 1: Foundation (Q1 2026)
- ✅ Skills registry created
- ✅ SM-Portal project scaffolded
- ✅ System architecture documentation complete
- 🔄 MVP: MMS175 endpoint exposure with RBAC + audit

### Phase 2: Enhancement (Q2 2026)
- Enhanced UI features (dashboard, statistics)
- 5+ additional endpoints (MMS200, MMS310, etc.)
- Execution statistics dashboard

### Phase 3: Advanced Features (Q3-Q4 2026)
- Approval workflows
- Batch operations
- Audit report generation UI

## 🔗 Related Resources

### Internal Projects
- **movex-rest-api**: `C:\Projects\MOVEX\API-Integration\movex-rest-api\`
- **Skills Registry**: `C:\Projects\.github\skills\`
- **SRX Template**: `C:\Projects\IT-Strategy\foundation\templates\srx-project-template\`

### Skills Referenced
- **Architecture**:
  - [rbac-endpoint-control](../../../.github/skills/architecture/rbac-endpoint-control/skill.md)
  - [audit-logging-framework](../../../.github/skills/architecture/audit-logging-framework/skill.md)
  - [generic-endpoint-executor](../../../.github/skills/architecture/generic-endpoint-executor/skill.md)

- **Integration**:
  - [m3-transaction-builder](../../../.github/skills/integration/m3-transaction-builder/skill.md)
  - [m3-response-parser](../../../.github/skills/integration/m3-response-parser/skill.md)

- **Manufacturing**:
  - [inventory-operations](../../../.github/skills/manufacturing/inventory-operations/skill.md)

### External References
- [ISO 27001:2013](https://www.iso.org/standard/54534.html)
- [ASP.NET Core Documentation](https://docs.microsoft.com/aspnet/core)
- [Infor M3 MI Programming Guide](https://docs.infor.com/m3)

## 📞 Support

- **AI Agent**: Read [ai/rules.md](ai/rules.md) for development guidelines
- **Skills**: Check `C:\Projects\.github\skills\` for implementation patterns
- **M3 Context**: See [ai/memory/01-manufacturing-context.md](ai/memory/01-manufacturing-context.md)

---

**Last Updated**: 2026-02-09  
**Project Status**: Pre-Alpha (Design Phase)
