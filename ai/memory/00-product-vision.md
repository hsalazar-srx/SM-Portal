# MOVEX-Portal - Product Vision

**Last Updated**: 2026-02-03  
**Status**: Planned  
**Version**: 0.1.0 (Pre-Alpha)

## 🎯 Vision Statement

Provide a secure, user-friendly web portal that enables internal staff to safely interact with M3 MOVEX endpoints without technical expertise, while maintaining ISO 27001 compliance and comprehensive audit trails.

## 🧩 Problem Being Solved

### Current State (Pain Points)

1. **Technical Barrier**
   - Only developers/IT can interact with M3 API
   - Business users rely on email requests to IT
   - Delays of hours/days for simple operations

2. **Security Gaps**
   - No centralized audit trail for M3 API usage
   - Manual permission management (spreadsheets)
   - Difficult to prove compliance during audits

3. **Scalability Issues**
   - Adding new endpoints requires code deployment
   - Each endpoint needs custom controller/validation
   - Hard to maintain consistency across endpoints

4. **User Experience**
   - No self-service capability for business users
   - Complex Postman collections not user-friendly
   - Error messages technical and unclear

### Future State (Solution)

1. **Self-Service Portal**
   - Business users execute approved operations instantly
   - Simple web forms replace Postman/API calls
   - Clear validation and error messages

2. **Automated Compliance**
   - Every action logged with WHO/WHAT/WHEN/RESULT
   - ISO 27001 controls automatically satisfied
   - Audit reports generated on-demand

3. **Config-Driven Extensibility**
   - Add new endpoints via JSON config (no code)
   - RBAC managed centrally
   - Consistent validation/execution across all endpoints

4. **User-Friendly Experience**
   - Portal shows only endpoints user can access
   - Forms auto-generated from endpoint metadata
   - Real-time validation feedback

## 👥 Target Users

### Primary Users

1. **Warehouse Staff** (50+ users)
   - Execute: MMS175 (item movement), MMS200 (item lookup)
   - Need: Simple forms to move inventory between locations
   - Risk: Medium (operational data, not financial)

2. **Production Planners** (20+ users)
   - Execute: MMS310 (item creation), MMS850 (production orders)
   - Need: Quick item setup and order management
   - Risk: High (master data changes)

3. **Finance Team** (10+ users)
   - Execute: Financial posting endpoints (OIS350, etc.)
   - Need: Invoice processing, GL postings
   - Risk: Critical (financial transactions)

### Secondary Users

4. **IT Administrators** (5 users)
   - Manage: Endpoint registry, RBAC configuration
   - Monitor: Audit logs, execution statistics
   - Risk: Critical (system administration)

5. **Auditors** (External)
   - Query: Audit logs for compliance reviews
   - Generate: ISO 27001 compliance reports
   - Risk: N/A (read-only access)

## 🚀 Core Capabilities

### Phase 1: Foundation (Current Scope)

1. **Generic Endpoint Execution**
   - Config-driven executor for any M3 program/method
   - Validates fields, builds transactions, parses responses
   - Implements: `architecture/generic-endpoint-executor`

2. **RBAC Enforcement**
   - Windows AD integration for authentication
   - Role-based endpoint access control
   - Implements: `architecture/rbac-endpoint-control`

3. **Audit Logging**
   - Immutable audit trail for all operations
   - ISO 27001 compliance built-in
   - Implements: `architecture/audit-logging-framework`

4. **Portal UI (MVP)**
   - Home screen showing accessible endpoints
   - Dynamic form generation from metadata
   - Success/error message display

### Phase 2: Enhancement (Future)

5. **Advanced RBAC**
   - Field-level permissions (e.g., can update quantity but not price)
   - Approval workflows for high-risk operations
   - Time-based access (temporary permissions)

6. **Analytics & Monitoring**
   - Execution statistics dashboard
   - Performance metrics per endpoint
   - User activity reports

7. **Self-Service Admin**
   - Portal admins manage endpoint registry via UI
   - RBAC configuration UI
   - Audit log search UI

8. **Workflow Automation**
   - Multi-step workflows (e.g., create item + add to BOM)
   - Batch operations (upload CSV, execute bulk)
   - Scheduled jobs (daily inventory sync)

## 🎨 User Experience Principles

1. **Simplicity**
   - One-click access to common operations
   - No technical jargon in UI
   - Clear, actionable error messages

2. **Discoverability**
   - Users see only what they can access
   - Endpoints grouped by category (Inventory, Finance, etc.)
   - Tooltips explain each field

3. **Feedback**
   - Real-time field validation
   - Progress indicators for long operations
   - Success confirmations with details

4. **Consistency**
   - All forms follow same layout/style
   - Predictable navigation
   - Uniform error handling

## 🔒 Security & Compliance

### Security Model

- **Authentication**: Windows Integrated Auth (AD)
- **Authorization**: RBAC (AD groups → application roles)
- **Network**: On-prem only, IP allow-list
- **Data Protection**: Sensitive fields auto-masked in logs
- **API Keys**: Scoped, expiring, rotated (for service accounts)

### Compliance Requirements

- **ISO 27001**
  - A.12.4.1: Event logging ✓
  - A.12.4.3: Administrator activity ✓
  - A.12.4.4: System use monitoring ✓
  - A.13.1.3: Segregation of duties ✓

- **Audit Retention**
  - CRITICAL: 7 years
  - HIGH: 3 years
  - MEDIUM: 1 year
  - LOW: 90 days

## 📊 Success Metrics

### Phase 1 (Launch)

- **Adoption**: 50+ active users in first month
- **Performance**: <2s average response time
- **Reliability**: 99.5% uptime (M3 dependencies excluded)
- **Compliance**: 100% audit coverage for exposed endpoints
- **User Satisfaction**: NPS >40

### Phase 2 (Maturity)

- **Adoption**: 150+ active users
- **Self-Service**: 80% of operations completed without IT help
- **Audit**: Zero findings in ISO 27001 audit
- **Extensibility**: 20+ endpoints exposed via config (no code)

## 🛣️ Roadmap

### Q1 2026 (Current)
- ✅ Skills registry created
- ✅ Architecture design (3 core skills)
- 🔄 MOVEX-Portal project scaffolding
- ⏳ MVP implementation (MMS175 endpoint)

### Q2 2026
- Portal UI (React SPA with shadcn/ui + Tailwind CSS)
- MOVEX-Portal API (separate from movex-rest-api)
- RBAC implementation (AD integration)
- Audit logging (Db2/SQL Server backend)
- IIS deployment to SRXWEBAPP1

### Q3 2026
- Add 5+ additional endpoints (MMS200, MMS310, etc.)
- Execution statistics dashboard
- User onboarding documentation

### Q4 2026
- Approval workflows for high-risk ops
- Batch operations support
- Audit report generation UI

## 🔗 Related Projects

- **movex-rest-api** - Backend M3 API integration (reused by portal)
- **Skills Registry** - Centralized capability definitions
- **SRX Project Template** - Standard project structure

## 📚 References

- Skills Registry: `C:\Projects\.github\skills\`
- MOVEX REST API: `C:\Projects\MOVEX\API-Integration\movex-rest-api\`
- ISO 27001 Controls: [ISO/IEC 27001:2013](https://www.iso.org/standard/54534.html)
