# AI Agent Rules for MOVEX-Portal

## Project Context

MOVEX-Portal is a secure, user-friendly web portal that exposes selected M3 MOVEX API endpoints to internal users with role-based access control (RBAC), audit logging, and ISO 27001 compliance.

## Skills Registry

This project implements the following centralized skills from `C:\Projects\.github\skills\`:

### Architecture Skills
- **`architecture/rbac-endpoint-control`** - Role-based access control for endpoint exposure
- **`architecture/audit-logging-framework`** - ISO 27001-compliant audit logging
- **`architecture/generic-endpoint-executor`** - Config-driven M3 endpoint execution

### Integration Skills
- **`integration/m3-transaction-builder`** - Build M3 API transaction configs
- **`integration/m3-response-parser`** - Parse M3 responses with type conversion

### Manufacturing Skills
- **`manufacturing/inventory-operations`** - Stock management, transfers, validation

## Multi-Agent Collaboration

**Primary Agents:**
- **@expert-movex-erp** - M3 transactions, business rules, MOVEX database expertise
- **@architect-system-design** - Portal architecture, RBAC design, ADR creation
- **@developer-dotnet** - React + .NET implementation, service layer
- **@developer-integration** - M3 API client implementation, connection pooling

**Collaboration Workflow:**
1. **Task received** → @expert-movex-erp analyzes M3 requirements and business rules
2. **Architecture review** → @architect-system-design evaluates impact, creates ADR if needed
3. **Implementation** → @developer-dotnet (React UI, .NET services) + @developer-integration (M3 clients)
4. **Quality review** → @validator-quality performs security audit (RBAC, audit logging, ISO 27001)
5. **Documentation** → @documenter-technical updates endpoint registry docs, runbooks

**Example Workflow (New M3 Endpoint):**
```
User Request: Add purchase order creation endpoint
→ @expert-movex-erp: Specifies PPS200MI program, required fields, business rules
→ @architect-system-design: Reviews RBAC implications, approves config-driven approach
→ @developer-integration: Implements M3 transaction builder for PPS200MI
→ @developer-dotnet: Adds endpoint config, UI form metadata, validation rules
→ @validator-quality: Verifies RBAC enforcement, audit logging, field masking
→ @documenter-technical: Updates endpoint-registry.json docs, operational runbook
```

**Governance:** `C:\.github\governance\mas-rules.yaml`
**Agent Registry:** `C:\.github\agents\manifest.json`

## Core Principles

1. **Skills-Based Architecture**
   - All implementations MUST reference and follow skills from the centralized registry
   - Skills are documentation; implementation lives in this project
   - When implementing a skill, create files in `src/` that follow the skill's interfaces

2. **Security First**
   - Windows Integrated Authentication (AD) required
   - RBAC enforced at every endpoint call
   - Sensitive data auto-masked in audit logs
   - API keys scoped with expiry and rotation
   - Network isolation (on-prem only, IP allow-list)

3. **Configuration Over Code**
   - Endpoints defined in JSON, not hardcoded controllers
   - RBAC roles mapped in config
   - Field validation driven by metadata
   - No code changes needed to add new endpoints

4. **Audit Everything**
   - Every endpoint call logged with WHO/WHAT/WHEN/RESULT
   - Audit logs immutable and encrypted
   - Retention policies by risk level (CRITICAL=7yrs, HIGH=3yrs, MEDIUM=1yr, LOW=90days)
   - ISO 27001 compliance built-in

5. **User-Friendly Portal**
   - Dynamic UI based on user's accessible endpoints
   - Forms auto-generated from endpoint metadata
   - Real-time validation feedback
   - Clear success/error messages

## Development Rules

### When Adding Code

1. **Check skills registry first** - Has this capability been defined as a skill or any skill similar
2. **Follow skill interfaces** - Implement the exact interfaces defined in skill.md
3. **Document skill usage** - Reference skill in code comments: `// Implements: architecture/generic-endpoint-executor`
4. **Update AI memory** - Document decisions in `ai/memory/` and `ai/evidence/`

### When Adding Endpoints

1. **Update `config/endpoint-registry.json`** - No code changes needed
2. **Map AD group to role** - Add to RBAC configuration
3. **Test with real user** - Verify RBAC and audit logging
4. **Document in runbook** - Add to operational docs

### When Troubleshooting

1. **Check audit logs** - All executions are logged
2. **Review connection pool stats** - Connection reuse issues
3. **Verify RBAC config** - Permission denied errors
4. **Test with Postman** - Isolate portal vs. API issues

## File Organization

```
MOVEX-Portal/
├── ai/                          ← AI agent context
│   ├── memory/                  ← Long-term knowledge
│   ├── planning/                ← Sprint plans, initiatives
│   ├── tasks/                   ← Task tracking
│   └── evidence/                ← Decision logs, change impact
├── src/                         ← Backend implementation (MOVEX-Portal API)
│   ├── Controllers/             ← HTTP endpoints
│   ├── Services/                ← Business logic implementing skills
│   ├── Middleware/              ← RBAC, audit logging
│   ├── Models/                  ← DTOs and domain models
├── config/                      ← Runtime configuration (endpoint + RBAC)
├── frontend/                    ← React SPA (shadcn/ui + Tailwind)
├── tests/                       ← Unit and integration tests
└── docs/                        ← Documentation
```

## Integration with movex-rest-api

MOVEX-Portal **depends on** the existing `movex-rest-api` project:

- **Reuses**: Connection pool, transaction builder, response parser
- **Adds**: Portal UI, RBAC, audit logging, endpoint discovery
- **Deployment**: Separate IIS application on SRXWEBAPP1

## Deployment Target

- **Server**: SRXWEBAPP1 (Windows Server, IIS)
- **Environment**: On-premises, internal network only
- **Authentication**: Windows Integrated Auth (Active Directory)
- **Database**: Db2 (iSeries) for M3 data, optional SQL Server for audit logs



## Agent Behavior

- **ALWAYS** reference skills when implementing features
- **NEVER** hardcode endpoint logic; use generic executor
- **ALWAYS** log audit events for compliance
- **NEVER** expose endpoints without RBAC checks
- **ALWAYS** mask sensitive data in logs
- **NEVER** bypass Windows Authentication
- **ALWAYS** use Architecture diagrams for system context

## See Also

- Skills Registry: `C:\Projects\.github\skills\`
- MOVEX REST API: `C:\Projects\MOVEX\API-Integration\movex-rest-api\`
- Project Template: `C:\Projects\IT-Strategy\foundation\templates\srx-project-template\`
