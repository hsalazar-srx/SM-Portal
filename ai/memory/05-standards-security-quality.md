# MOVEX-Portal - Standards, Security & Quality

**Last Updated**: 2026-02-09  
**Status**: Draft  
**Version**: 0.1.0

## ✅ Standards & Compliance

### Required Standards
- **ISO 27001** audit controls
- **TLS 1.2+** for all connections (M3 API, SQL, web)
- **Windows AD Authentication** for user identity
- **Audit Retention** by risk level (CRITICAL=7y, HIGH=3y, MEDIUM=1y, LOW=90d)

### Encryption
- **SQL Server TDE enabled** for audit database
- **Secrets in User Secrets** (no hardcoded connection strings)

---

## 🔒 Security Requirements

### Authentication & Authorization
- Windows Integrated Authentication (Kerberos/NTLM)
- Role-Based Access Control (RBAC)
- Risk-level enforcement per endpoint

### Data Protection
- Mask sensitive fields in audit logs (PII, credentials)
- Avoid storing tokens in persistent client storage
- Use HTTPS everywhere

### Logging
- Log WHO/WHAT/WHEN/RESULT for all endpoint executions
- Include request duration and result status
- Separate audit logs from application logs

---

## ✅ Quality Gates

### Before Implementation
- [ ] `ai/memory/00-skills-audit.md` complete
- [ ] Integration contracts documented
- [ ] Approval for Decision-001

### Before MVP Release
- [ ] RBAC enforced on every endpoint
- [ ] Audit logs verified in SQL Server
- [ ] Input validation applied to all fields
- [ ] Error handling masks sensitive data

### Testing Requirements
- Unit tests for services and validators
- Integration tests for RBAC + Audit middleware
- E2E tests for MMS175 flow

---

## 🔍 Security Review Checklist

- [ ] TLS 1.2+ enforced on IIS bindings
- [ ] HSTS enabled
- [ ] CSP headers configured
- [ ] IP allowlist applied (internal network only)
- [ ] JWT token expiry configured
- [ ] Audit log integrity hashing enabled

---

## 📌 References

- `ai/rules.md`
- `ai/memory/02-system-architecture.md`
- `ai/memory/03-integration-contracts.md`

---

**Owner**: Security Team + IT Manager
