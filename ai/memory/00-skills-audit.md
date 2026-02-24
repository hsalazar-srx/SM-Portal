# MOVEX-Portal - Skills Audit

**Last Updated**: 2026-02-09  
**Status**: In Progress  
**Owner**: Architecture Team  

## ✅ Skills Audit Summary

This project follows the **SRX Skills-Based Architecture**. The following centralized skills have been identified as required for Phase 1 delivery.

## 🔍 Skills in Use (Planned)

### Architecture Skills
| Skill | Purpose | Planned Implementation |
|-------|---------|------------------------|
| `architecture/rbac-endpoint-control` | Role-based access control at endpoint execution | `src/Middleware/RbacMiddleware.cs`, `src/Services/RbacService.cs` |
| `architecture/audit-logging-framework` | ISO 27001 audit logging | `src/Middleware/AuditMiddleware.cs`, `src/Services/AuditService.cs` |
| `architecture/generic-endpoint-executor` | Config-driven M3 execution | `src/Services/GenericEndpointExecutor.cs` |
| `architecture/endpoint-registry-provider` | Load/validate endpoint registry with hot-reload | `src/Services/EndpointRegistryProvider.cs` |
| `architecture/endpoint-discovery-service` | Filtered endpoint metadata for UI | `src/Services/EndpointDiscoveryService.cs` |
| `architecture/ui-ux-best-practices` | Token-driven UI/UX standards for frontend | `frontend/` (Vite + Tailwind + shadcn/ui) |

### Integration Skills
| Skill | Purpose | Planned Implementation |
|-------|---------|------------------------|
| `integration/m3-transaction-builder` | Build M3 transaction payloads | Reuse from `movex-rest-api` |
| `integration/m3-response-parser` | Parse M3 responses | Reuse from `movex-rest-api` |

### Manufacturing Skills
| Skill | Purpose | Planned Implementation |
|-------|---------|------------------------|
| `manufacturing/inventory-operations` | Inventory movement rules & validation | `src/Services/InventoryOperations.cs` |

---

## 🧩 Skill-to-Component Mapping

| Component | Skill(s) | Notes |
|----------|----------|-------|
| Endpoint Executor | `architecture/generic-endpoint-executor` | Central orchestration of endpoint execution |
| Endpoint Registry | `architecture/endpoint-registry-provider` | Loads/validates endpoint definitions |
| Endpoint Discovery | `architecture/endpoint-discovery-service` | Filters endpoints by RBAC/risk |
| RBAC Middleware | `architecture/rbac-endpoint-control` | Enforces AD → Role → Endpoint mapping |
| Audit Middleware | `architecture/audit-logging-framework` | Logs WHO/WHAT/WHEN/RESULT |
| M3 Adapter | `integration/m3-transaction-builder`, `integration/m3-response-parser` | Reused from `movex-rest-api` |
| Inventory Workflows | `manufacturing/inventory-operations` | MMS175 validation logic |

---

## ⚠️ Skills Gaps / To Confirm

These are **potential gaps** to validate before implementation:

- **Dynamic form generation** for config-driven UI (may require new skill or pattern)
- **PII masking strategy** for audit logging fields
- **Client-side validation** patterns for the React + shadcn/ui UI

---

## 👥 Agents Consulted (Planned)

- **@expert-movex-dotnet** - M3 integration patterns and .NET best practices
- **@expert-sql-server-2005** - Legacy SQL optimizations for audit log schema

---

## ✅ Next Actions

1. Validate skills against `C:\Projects\.github\skills\manifest.json`
2. Confirm no additional skills are required for Phase 1 MVP
3. Update this file as implementations begin

---

**Compliance Note**: This file must exist **before any implementation files** are committed (enforced by SRX template).