# MOVEX-Portal

**Secure, User-Friendly Web Portal for M3 MOVEX Endpoint Exposure**

[![Status](https://img.shields.io/badge/status-frontend%20mvp-green)]()
[![Frontend](https://img.shields.io/badge/frontend-react%2B%20typescript-blue)]()
[![.NET](https://img.shields.io/badge/.NET-8.0-blue)]()
[![License](https://img.shields.io/badge/license-proprietary-lightgrey)]()

## 🎯 Overview

MOVEX-Portal enables internal staff to safely interact with M3 MOVEX endpoints through a web interface, with role-based access control, comprehensive audit logging, and ISO 27001 compliance.

### Current Status (Feb 25, 2026)

✅ **Frontend MVP Complete**
- Responsive design system with semantic tokens
- Component library (10+ components)
- Mobile-optimized UI with hamburger navigation
- Interactive component showcase
- Ready for backend integration

🚧 **Backend Architecture** (Planned)
- RBAC enforcement, audit logging, generic executor

### Key Features

- ✅ **Responsive UI** - Mobile-first design with desktop layouts (Implemented)
- ✅ **Component Library** - Input, Badge, Tabs, Spinner, Stats, Card (Implemented)
- ✅ **Design System** - 8px spacing grid, semantic colors, fluid typography (Implemented)
- ✅ **Mobile Navigation** - Hamburger menu + responsive header (Implemented)
- 📋 **Config-Driven** - Add endpoints via JSON, no code changes (Planned)
- 📋 **RBAC Enforcement** - Windows AD integration for auth/authz (Planned)
- 📋 **Audit Logging** - ISO 27001-compliant immutable audit trail (Planned)
- 📋 **Dynamic UI** - Forms auto-generated from endpoint metadata (Planned)
- 📋 **Generic Executor** - Single orchestrator for all M3 endpoints (Planned)
- 📋 **Self-Service** - Business users execute approved operations without IT help (Planned)

## 🏗️ Architecture

### Workspace Standards Compliance

**IMPORTANT:** This project MUST comply with **[WORKSPACE_RULES.md](../.github/WORKSPACE_RULES.md)**.

**Key Requirements:**
- ✅ Audit logs in **SQL Server** with standard schema (SRX_AuditLog)
- ✅ **TLS 1.2+** for all connections (M3 API, database)
- ✅ Connection strings in **User Secrets** (never hardcoded)
- ✅ **ISO 27001** compliant audit trail (7-year retention)
- ✅ Windows AD authentication/authorization (RBAC)
- ✅ Encryption at rest (SQL Server TDE enabled)

**Validation:** Run `../.github/scripts/validate-workspace-compliance.ps1` locally.

---

### Skills-Based Design

This project implements **centralized skills** from `C:\Projects\.github\skills\`:

| Skill | Category | Implementation Status |
|-------|----------|---------------------|
| **rbac-endpoint-control** | Architecture | ✅ Implemented |
| **audit-logging-framework** | Architecture | 📋 Planned |
| **generic-endpoint-executor** | Architecture | 📋 Planned |
| **endpoint-registry-provider** | Architecture | ✅ Implemented |
| **endpoint-discovery-service** | Architecture | ✅ Implemented |
| **ui-ux-best-practices** | Architecture | ✅ Registered |
| **m3-transaction-builder** | Integration | ✓ Reused from REST API |
| **m3-response-parser** | Integration | ✓ Reused from REST API |

📖 **See**: [Skills Registry](../.github/skills/) for detailed implementation patterns

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Internal Users                          │
│               (Windows AD Authentication)                    │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS
┌──────────────────────────▼──────────────────────────────────┐
│            MOVEX-Portal (SPA + Portal API)                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Portal UI (React SPA)                               │   │
│  │  - shadcn/ui + Tailwind CSS                          │   │
│  │  - Dynamic forms from metadata                       │   │
│  │  - Role-based endpoint visibility                    │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Portal API Services                                 │   │
│  │  - Generic Endpoint Executor                         │   │
│  │  - RBAC authorization                                │   │
│  │  - Field validation                                  │   │
│  │  - Transaction orchestration                         │   │
│  │  - Audit logging                                     │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Middleware Layer                                    │   │
│  │  - RBAC Enforcement                                  │   │
│  │  - Audit Logger                                      │   │
│  │  - Exception Handler                                │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│           movex-rest-api (Shared Components)                │
│  - Connection Pool                                          │
│  - Transaction String Builder                               │
│  - M3 Response Parser                                       │
└──────────────────────────┬──────────────────────────────────┘
                           │ TCP/IP (MI Protocol)
┌──────────────────────────▼──────────────────────────────────┐
│              M3 MOVEX (IBM iSeries)                         │
│  - MMS175MI (Item Movement)                                 │
│  - MMS200MI (Item Lookup)                                   │
│  - MMS310MI (Item Maintenance)                              │
│  - MMS850MI (Production Orders)                             │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- .NET 8.0 SDK
- Access to M3 MOVEX system (via movex-rest-api)
- Windows Server with IIS (for deployment)
- Active Directory (for user authentication)
- SQL Server or Db2 (for audit log storage)

### Development Setup

```powershell
# Navigate to project
cd C:\Projects\MOVEX-Portal

# (Implementation underway - see roadmap below)
```

### Configuration

Portal behavior is driven by JSON configuration files:

**`config/endpoint-registry.json`** - Define exposed endpoints:
```json
{
  "endpoints": [
    {
      "id": "mms175-update",
      "program": "MMS175MI",
      "method": "Update",
      "displayName": "Item Movement",
      "requiredRole": "MMS175_UPDATER",
      "riskLevel": "HIGH",
      "fields": [
        { "name": "WHLO", "description": "Warehouse", "required": true, "maxLength": 3 },
        { "name": "ITNO", "description": "Item Number", "required": true, "maxLength": 15 },
        { "name": "WHSL", "description": "From Location", "required": true, "maxLength": 10 },
        { "name": "TWSL", "description": "To Location", "required": true, "maxLength": 10 },
        { "name": "TRQT", "description": "Quantity", "required": true, "type": "decimal" }
      ]
    }
  ]
}
```

**`config/rbac-config.json`** - Map AD groups to roles:
```json
{
  "roles": [
    {
      "name": "MMS175_UPDATER",
      "adGroups": ["CN=Warehouse-Staff,OU=Users,DC=company,DC=com"],
      "endpoints": ["MMS175MI/Update"]
    },
    {
      "name": "MMS200_VIEWER",
      "adGroups": ["CN=All-Staff,OU=Users,DC=company,DC=com"],
      "endpoints": ["MMS200MI/GetItmBasic", "MMS200MI/LstItemsByGrp"]
    }
  ]
}
```

## 📋 Project Structure

```
MOVEX-Portal/
├── ai/                         ← AI agent context
│   ├── rules.md                ← Development guidelines
│   ├── memory/                 ← Long-term knowledge base
│   ├── planning/               ← Sprint planning
│   ├── tasks/                  ← Task tracking
│   └── evidence/               ← Decision logs, change impact
├── src/                        ← Backend implementation (ASP.NET Core API)
│   ├── Controllers/            ← HTTP endpoints
│   ├── Services/               ← Business logic (skill implementations)
│   │   ├── GenericEndpointExecutor.cs
│   │   ├── EndpointRegistryProvider.cs
│   │   ├── EndpointDiscoveryService.cs
│   │   ├── RbacService.cs
│   │   └── AuditService.cs
│   ├── Middleware/             ← RBAC, audit logging
│   │   ├── RbacMiddleware.cs
│   │   └── AuditLoggingMiddleware.cs
│   ├── Models/                 ← DTOs and domain models
│   │   ├── EndpointRegistry.cs
│   │   ├── EndpointDefinition.cs
│   │   ├── EndpointField.cs
│   │   ├── ExecutionResult.cs
│   │   ├── UserContext.cs
│   │   ├── AuditEvent.cs
│   │   ├── RbacResult.cs
│   │   └── RiskLevel.cs
├── config/                     ← Runtime configuration (endpoint + RBAC)
│   ├── endpoint-registry.json
│   └── rbac-config.json
├── frontend/                   ← React SPA (shadcn/ui + Tailwind) [Planned]
├── tests/                      ← Unit and integration tests
├── docs/                       ← Documentation
│   └── diagrams/               ← Architecture diagrams
├── INDEX.md                    ← Project navigation
└── README.md                   ← This file
```

## 🎯 Roadmap

### Phase 1: Foundation (Q1 2026) 🔄

- [x] Skills registry created (3 architecture skills)
- [x] MOVEX-Portal project scaffolding
- [x] System architecture documentation
- [x] [Architecture decision](ai/evidence/decision-001-react-spa-architecture.md): React SPA + ASP.NET API
- [x] MVP: MMS175 endpoint with RBAC + audit (RBAC complete)

**Deliverables**:
- Generic endpoint executor service
- ✅ RBAC middleware with AD integration (complete)
- Audit logging middleware
- React SPA UI with shadcn/ui + Tailwind CSS
- OpenAPI/Swagger documentation

**Evidence & Decisions**:
- [Decision Log 001](ai/evidence/decision-001-react-spa-architecture.md): Adopt React 18 + shadcn/ui + Tailwind CSS architecture
- [Decision Log 002](ai/evidence/decision-002-separate-portal-api.md): Keep Portal API separate from movex-rest-api
- [Change Impact 001](ai/evidence/change-impact-001-architecture-diagrams.md): Architecture diagrams updated
- [Change Impact 002](ai/evidence/change-impact-002-shadcn-ui-adoption.md): Updated to shadcn/ui + Tailwind CSS
- [Change Impact 003](ai/evidence/change-impact-003-skills-registry-and-stubs.md): Skills registry updates & stubs
- [Change Impact 004](ai/evidence/change-impact-004-separate-portal-api.md): Separate Portal API decision
- [Change Impact 005](ai/evidence/change-impact-005-middleware-and-config.md): Middleware + config placeholders

### Phase 2: Enhancement (Q2 2026)

- [ ] Enhanced UI features (dashboard, statistics)
- [ ] Add 5+ endpoints (MMS200, MMS310, MMS850, etc.)
- [ ] Execution statistics dashboard
- [ ] IIS deployment to SRXWEBAPP1

**Deliverables**:
- Production-ready portal
- User onboarding documentation
- Admin runbook

### Phase 3: Advanced Features (Q3-Q4 2026)

- [ ] Approval workflows for high-risk operations
- [ ] Batch operations (CSV upload)
- [ ] Audit report generation UI
- [ ] Self-service admin portal

## 🔒 Security & Compliance

### Security Model

- **Authentication**: Windows Integrated Auth (Active Directory)
- **Authorization**: Role-Based Access Control (RBAC, fully implemented)
  - Roles defined in config
  - Mapped to AD groups
  - Enforced at middleware level (tested)
  - `/api/auth/test` endpoint exposes user/claim info for RBAC validation
- **Network Security**: On-premises only, IP allow-list
- **Data Protection**: Sensitive fields auto-masked in logs
- **API Keys**: Scoped, expiring (for service accounts)

### ISO 27001 Compliance

| Control | Requirement | Implementation |
|---------|-------------|----------------|
| **A.12.4.1** | Event logging | All endpoint calls logged with WHO/WHAT/WHEN |
| **A.12.4.3** | Admin activity | Admin operations tagged CRITICAL |
| **A.12.4.4** | System monitoring | Execution statistics, anomaly detection |
| **A.13.1.3** | Segregation of duties | Role-based access enforcement |

### Audit Retention

- **CRITICAL**: 7 years (financial transactions)
- **HIGH**: 3 years (master data changes)
- **MEDIUM**: 1 year (standard operations)
- **LOW**: 90 days (read-only queries)

## 📖 Documentation

### 🎯 Evidence (Decisions & Change Impact)
| Document | Purpose | Status |
|----------|---------|--------|
| [ai/evidence/decision-log.md](ai/evidence/decision-log.md) | Decision index | ✓ Complete |
| [ai/evidence/decision-001-react-spa-architecture.md](ai/evidence/decision-001-react-spa-architecture.md) | React SPA decision | ✅ Approved |
| [ai/evidence/decision-002-separate-portal-api.md](ai/evidence/decision-002-separate-portal-api.md) | Separate Portal API | ✅ Approved |
| [ai/evidence/decision-003-style-guide-approval.md](ai/evidence/decision-003-style-guide-approval.md) | Style guide approval | ✅ Approved |
| [ai/evidence/change-impact.md](ai/evidence/change-impact.md) | Change impact index | ✓ Complete |
| [ai/evidence/change-impact-001-architecture-diagrams.md](ai/evidence/change-impact-001-architecture-diagrams.md) | Diagram updates | ✓ Complete |
| [ai/evidence/change-impact-002-shadcn-ui-adoption.md](ai/evidence/change-impact-002-shadcn-ui-adoption.md) | shadcn/ui adoption | ✓ Complete |
| [ai/evidence/change-impact-004-separate-portal-api.md](ai/evidence/change-impact-004-separate-portal-api.md) | Separate Portal API | ✓ Complete |
| [ai/evidence/change-impact-005-middleware-and-config.md](ai/evidence/change-impact-005-middleware-and-config.md) | Middleware + config placeholders | ✓ Complete |
| [ai/evidence/change-impact-006-style-guide-approval.md](ai/evidence/change-impact-006-style-guide-approval.md) | Style guide approval | ✓ Complete |
| [ai/evidence/release-notes.md](ai/evidence/release-notes.md) | Release history | 📋 Planned |

### 🧠 AI Memory (Long-Term Context)
| Document | Purpose | Status |
|----------|---------|--------|
| [ai/memory/00-product-vision.md](ai/memory/00-product-vision.md) | Vision, goals, metrics | ✓ Complete |
| [ai/memory/00-skills-audit.md](ai/memory/00-skills-audit.md) | Skills audit (mandatory) | ✓ Complete |
| [ai/memory/01-manufacturing-context.md](ai/memory/01-manufacturing-context.md) | M3 MOVEX context | ✓ Complete |
| [ai/memory/02-system-architecture.md](ai/memory/02-system-architecture.md) | System architecture | ✓ Complete |
| [ai/memory/03-integration-contracts.md](ai/memory/03-integration-contracts.md) | Integration contracts | ✓ Complete |
| [ai/memory/03-technology-stack.md](ai/memory/03-technology-stack.md) | Technology decisions | ✓ Complete |
| [ai/memory/04-deployment-guide.md](ai/memory/04-deployment-guide.md) | Deployment procedures | ✓ Complete |
| [ai/memory/04-governance-and-decisions.md](ai/memory/04-governance-and-decisions.md) | Governance process | ✓ Complete |
| [ai/memory/05-standards-security-quality.md](ai/memory/05-standards-security-quality.md) | Standards & security | ✓ Complete |
| [ai/memory/06-known-risks-and-pitfalls.md](ai/memory/06-known-risks-and-pitfalls.md) | Risk register | ✓ Complete |
| [ai/memory/07-product-roadmap.md](ai/memory/07-product-roadmap.md) | Product roadmap | ✓ Complete |

### 🗺️ Diagrams
| Document | Purpose | Status |
|----------|---------|--------|
| [docs/diagrams/README.md](docs/diagrams/README.md) | Diagram index | ✓ Complete |
| [docs/diagrams/architecture.md](docs/diagrams/architecture.md) | System architecture | ✓ Complete |
| [docs/diagrams/auth-flow.md](docs/diagrams/auth-flow.md) | Auth + RBAC flow | ✓ Complete |
| [docs/diagrams/deployment-topology.md](docs/diagrams/deployment-topology.md) | Deployment topology | ✓ Complete |
| [docs/diagrams/data-flow.md](docs/diagrams/data-flow.md) | Data flow | ✓ Complete |
| [docs/diagrams/integration-sequence.md](docs/diagrams/integration-sequence.md) | Integration sequence | ✓ Complete |
| [docs/diagrams/workflow-process.md](docs/diagrams/workflow-process.md) | MMS175 workflow | ✓ Complete |
| [docs/diagrams/decision-tree.md](docs/diagrams/decision-tree.md) | Endpoint exposure decision tree | ✓ Complete |

## 🔗 Related Projects

- **movex-rest-api**: `C:\Projects\MOVEX\API-Integration\movex-rest-api\`
  - Provides connection pool, transaction builder, response parser
  - MOVEX-Portal extends this with RBAC and UI

- **Skills Registry**: `C:\Projects\.github\skills\`
  - Centralized capability definitions
  - Skills referenced by this project

- **SRX Project Template**: `C:\Projects\IT-Strategy\foundation\templates\srx-project-template\`
  - Standard project structure
  - AI agent integration patterns

## 🤝 Contributing

This is an internal SRX project. Development follows:

1. **Skills-based architecture** - Implement skills from registry
2. **AI-first development** - Use AI agents with context in `ai/`
3. **Config-driven design** - Minimize hardcoding
4. **Security by default** - RBAC + audit on every endpoint

See [ai/rules.md](ai/rules.md) for detailed guidelines.

## 📞 Support

- **Skills Reference**: Check `C:\Projects\.github\skills\` for implementation patterns
- **M3 Context**: See [ai/memory/01-manufacturing-context.md](ai/memory/01-manufacturing-context.md)
- **AI Guidelines**: Read [ai/rules.md](ai/rules.md)


