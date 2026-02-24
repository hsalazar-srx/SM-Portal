# Meeting Proposal — AD Groups & RBAC for MOVEX-Portal

## Objectives
- Establish a three-layer access model (AD group → role → endpoint) with least-privilege enforcement and risk-tier controls.
- Align RBAC and audit logging with workspace compliance rules, including mandatory audit capture and access controls.
- Provide a naming and governance model that scales to future RBAC-enabled applications.

## Model (AD group → role → endpoint)
- Identity source: Windows Integrated Authentication. AD group membership is the authoritative source of access.
- RBAC mapping: AD groups map to application roles via config, roles map to endpoint IDs in the endpoint registry.
- Enforcement: Each role has an explicit allow-list of endpoint IDs plus a `maxRiskLevel` gate (`LOW | MEDIUM | HIGH | CRITICAL`). Access is granted only when both the endpoint is allowed and its `riskLevel` ≤ `maxRiskLevel`.
- Decision: Use endpoint IDs from the endpoint registry as the permission keys.

## Naming Conventions (AD groups)
- Convention: `SRX_<Env>_<App>_<Function>_<Privilege>`
  - Env: `DEV | TEST | UAT | PROD`
  - App: `MOVEX | MYINVOIS | MOVEXAPI` (movex-rest-api)
  - Function: `OPERATE | APPROVE | AUDIT | ADMIN` (or domain-specific capability)
  - Privilege: `READ | EXEC | ADMIN`
- Use `SAMAccountName` (short name) in config for readability and stability.
- Example: `SRX_PROD_MOVEX_OPERATE_EXEC`

## Role Taxonomy (MyInvois + movex-rest-api)
- Operator: day-to-day actions; allow-list of operational endpoints; `maxRiskLevel` `MEDIUM`.
- Approver: approval workflows and high-impact actions; targeted allow-list; `maxRiskLevel` `HIGH`.
- Auditor: read-only access to audit and reporting endpoints; `maxRiskLevel` `LOW`.
- Admin: configuration and break-glass maintenance; tightly scoped; `maxRiskLevel` `CRITICAL`; requires approval workflow.

## Concrete Example (mirrors rbac-config structure)
- Role name: `MyInvois_Operator`
  - `adGroups`: `SRX_PROD_MYINVOIS_OPERATE_EXEC`
  - `allowedEndpoints`: `myinvois-submit`, `myinvois-status`, `myinvois-search`
  - `maxRiskLevel`: `MEDIUM`
- Role name: `MOVEXAPI_Approver`
  - `adGroups`: `SRX_PROD_MOVEXAPI_APPROVE_EXEC`
  - `allowedEndpoints`: `mms175-update`
  - `maxRiskLevel`: `HIGH`

## Governance
- High-risk role changes (`HIGH/CRITICAL`) require Infrastructure + Application owner approval.
- Quarterly recertification of all AD group memberships and role mappings.
- Break-glass: time-bound, documented, and logged; access expires automatically.
- Log authorization failures (denies) to audit trail; include user, endpoint ID, risk level, and decision.

## Audit & Retention
- Mandatory audit logging for all endpoint executions and RBAC denials, with encryption in transit and at rest.
- Retention policy: tiered by risk level (`LOW 90 days`, `MEDIUM 1 year`, `HIGH 3 years`, `CRITICAL 7 years`) is the primary policy. This conflicts with workspace minimum retention (7 years for all logs) and requires exception approval or formal variance.

## Implementation Notes
- RBAC config: roles defined with name, description, `adGroups`, `allowedEndpoints`, and `maxRiskLevel`.
- Endpoint registry: endpoint definitions include `id` and `riskLevel`; ids are used as permission keys in RBAC.
- Add/update endpoints via config (no hardcoding in controllers) and verify RBAC + audit logging.

## Next Steps
- Confirm retention policy decision and exception approval path.
- Approve naming convention and role taxonomy for MyInvois and movex-rest-api.
- Populate initial AD groups and map them into `rbac-config.json`.
- Schedule initial recertification and define break-glass workflow owners.
