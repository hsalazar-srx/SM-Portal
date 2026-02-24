# MOVEX-Portal - Known Risks & Pitfalls

**Last Updated**: 2026-02-09  
**Status**: Draft  

## ⚠️ Risks (Current)

### 1) Legacy M3 Constraints
- M3 RPG 12.4 on IBM iSeries (unpatched since 2006)
- Limited support window and fragile integration layer

**Mitigation**:
- Use existing `movex-rest-api` as integration boundary
- Avoid direct database writes

---

### 2) Nightly Batch Windows
- M3 batch jobs lock files nightly (11 PM – 2 AM)

**Mitigation**:
- Show maintenance window warning in UI
- Disable execution during lock window

---

### 3) AD Group Drift
- RBAC depends on accurate AD group membership

**Mitigation**:
- Periodic audit of AD group mappings
- Log every authorization decision

---

### 4) Audit Log Growth
- High transaction volume will grow audit DB quickly

**Mitigation**:
- Partition audit table by month
- Archive by retention policy

---

### 5) API Key Rotation
- movex-rest-api API keys must expire/rotate

**Mitigation**:
- Use secrets storage and rotation schedule
- Alert if key nearing expiry

---

### 6) UI Performance
- SPA performance could degrade with large payloads

**Mitigation**:
- Use pagination and lazy loading
- Cache endpoint config with TanStack Query

---

## ✅ Lessons Learned (Placeholder)

- None recorded yet (implementation not started)

---

## Next Review

- Review after Phase 1 MVP
