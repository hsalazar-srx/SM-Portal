# Scanfil APAC Portal — Known Risks & Pitfalls

**Last Updated**: March 2026
**Status**: Active — updated post Phase 1 deployment

> Deployment issues and IIS pitfalls are documented separately in
> `06-deployment-lessons-learned.md` (7 issues, 8+ hours of hard-won experience).
> This file covers ongoing operational and strategic risks.

---

## Active Risks

### 1. Legacy M3 Constraints

**Risk:** M3 RPG 12.4 on IBM iSeries (unpatched since 2006). Limited support window and fragile integration layer. Direct MI socket calls can fail silently or return undocumented error codes.

**Impact:** M3 endpoint executor may produce unexpected results for edge-case inputs.

**Mitigation:**
- Use `movex-rest-api` as the integration boundary — never call M3 directly from the portal
- Avoid direct DB2 writes from the portal (use the M3 MI protocol instead)
- Log all M3 responses (success and error) in the audit trail
- Rate-test new endpoints in UAT before Production exposure

**Status:** Ongoing — no change expected

---

### 2. M3 Nightly Batch Windows

**Risk:** M3 batch jobs lock files nightly (11 PM – 2 AM AEST). Transactions submitted during this window may fail or be queued silently.

**Impact:** Users receive errors or delayed results without understanding why.

**Mitigation:**
- Display maintenance window warning in the portal UI when time is within 30 minutes of the window
- Consider disabling high-risk write operations during the lock window
- Document the window clearly in user guidance

**Status:** Not yet implemented in UI — Phase 2 backlog item

---

### 3. AD Group Drift

**Risk:** RBAC enforcement relies on accurate AD group membership. If users are added to or removed from groups without the portal being updated, access may be over- or under-granted.

**Impact:** Unauthorised access or access denial for legitimate users.

**Mitigation:**
- RBAC config in `config/rbac-config.json` maps AD groups to portal roles — review quarterly
- Log every RBAC authorisation and denial decision in the audit trail
- Alert IT when a user is denied access unexpectedly (future Phase 2 feature)

**Status:** Ongoing — quarterly review recommended

---

### 4. Audit Log Growth

**Risk:** As the number of integrations and users grows, the JSONL audit log will accumulate rapidly. High-volume operations (invoice extract, report execution) generate many events.

**Impact:** Disk space consumption on SRXWEBAPP1; log file may become unwieldy for compliance review.

**Mitigation:**
- Implement log rotation and archival by retention policy (CRITICAL: 7yr, HIGH: 3yr, MEDIUM: 1yr, LOW: 90d)
- Phase 2: move audit log to SQL Server for queryability (required for audit log viewer feature)
- Monitor disk usage on SRXWEBAPP1; alert at 80% of available space

**Status:** JSONL file growth expected to accelerate in Phase 2 as M3 and Reporting integrations go live

---

### 5. API Key Management Across Multiple Downstream Services

**Risk:** The portal now manages API keys for multiple downstream services (MyInvois-Service, Reporting-Service; more to come). Key rotation, expiry, and compromise are harder to manage at scale.

**Impact:** A compromised or expired key causes a 401/502 from the downstream service, breaking that integration for all users.

**Mitigation:**
- All keys stored in NTFS-protected `C:\ProgramData\SRX\SM-Portal\secrets.json` — not in source or config
- Establish a key rotation schedule: rotate every 90 days or on personnel change
- Smoke tests after each rotation confirm all downstream services respond correctly
- Phase 3: self-service admin UI for key rotation — eliminates manual server access for this task
- Document which key belongs to which service in the secrets file (use clear key names: `MyInvoisApi:ApiKey`, `ReportingApi:ApiKey`)

**Status:** Current secrets file has keys for MyInvois and Reporting-Service. Rotation process is manual.

---

### 6. Integration Dependency Cascade

**Risk:** As a gateway, the portal is only as available as its downstream services. A failure in MyInvois-Service, Reporting-Service, or MOVEX REST API causes that portal feature to fail — potentially giving users the impression the portal itself is broken.

**Impact:** User confusion; blame attributed to portal when the issue is downstream.

**Mitigation:**
- Polly resilience patterns on all HTTP clients (retry + circuit breaker) — already implemented
- Health dashboard (Phase 2) shows per-integration health so users and support can isolate the failing service
- Error messages in UI clearly state which downstream service is unavailable
- Portal health endpoint (`/api/auth/test`) reports portal-level health independently of integrations

**Status:** Polly resilience in place. User-facing error clarity needs improvement — Phase 2 item.

---

### 7. RBAC Config File as Single Point of Control

**Risk:** All access control decisions flow through `config/rbac-config.json`. An incorrect edit (wrong AD group name, typo in endpoint ID) can silently grant or deny access to groups of users across all integrations.

**Impact:** Security incident or mass access denial if misconfigured.

**Mitigation:**
- RBAC config changes require UAT verification before Production deployment
- Log RBAC denials — unexpected spikes indicate a misconfiguration
- Phase 3: admin UI for RBAC changes with validation before save
- Keep a versioned backup of `rbac-config.json` alongside each deployment

**Status:** Manual file editing is current process — risk is real until admin UI is built.

---

### 8. IIS Shared Server — UAT/Production Environment Confusion

**Risk:** UAT and Production run on the same SRXWEBAPP1 server. A deployment that does not correctly toggle `ASPNETCORE_ENVIRONMENT` can expose Swagger in Production, apply wrong rate limits, or use wrong secrets.

**Impact:** Security exposure (Swagger in Production); degraded user experience; incorrect audit data.

**Mitigation:**
- Deployment checklists enforce environment variable verification before and after deployment
- Swagger accessibility in Production is an explicit smoke test failure condition
- Documented in `docs/runbooks/uat-deployment.md` with exact steps and failure diagnostics

**Status:** Mitigation in place. Risk is procedural — depends on checklists being followed.

---

### 9. UI Performance at Scale

**Risk:** As the number of integrations, report types, and active users grows, the React SPA may experience performance degradation — especially in pages with large data sets (invoice lists, report results).

**Impact:** Slow page loads; poor user experience for Finance team reviewing large invoice histories.

**Mitigation:**
- Server-side pagination required for invoice and report results (currently client-side — Phase 2 item)
- TanStack Query caching for endpoint catalog and RBAC config
- Lazy loading of integration pages (code splitting via Vite)
- Set clear maximum result limits in downstream services (Reporting-Service: 50,000 row cap)

**Status:** Client-side pagination is a known limitation. Server-side pagination is a Phase 2 requirement.

---

### 10. New Integration Introduces Security Regression

**Risk:** Each new integration (WMS, MES, PLM) adds new proxy controllers, new RBAC roles, and new secrets. A hastily added integration may bypass audit logging, skip RBAC enforcement, or use weak access controls.

**Impact:** Security and compliance gap in the new integration area.

**Mitigation:**
- All new controllers must pass through `RbacMiddleware` and `AuditLoggingMiddleware` — no bypasses
- Pre-deployment checklist includes RBAC coverage verification for all new routes
- Architecture review required before any new integration goes to Production (MAS governance)
- Integration onboarding pattern documented in `07-product-roadmap.md` — follow it consistently

**Status:** Pattern is documented. Governance enforcement relies on review discipline.

---

## Resolved Risks (Closed)

| Risk | Resolution | Date |
|---|---|---|
| "Lessons Learned placeholder" | Replaced by `06-deployment-lessons-learned.md` (7 issues, full root cause and prevention) | March 2026 |
| Phase 1 deployment concerns | IIS deployment completed; 7 issues documented with prevention checklists | March 2026 |

---

## Next Review

- After Phase 2 deployment (Q2 2026) — review risks 4, 5, 6, 7
- After each new integration onboarding — assess risk 10
- Quarterly: review risk 3 (AD group drift) and risk 5 (API key rotation)
