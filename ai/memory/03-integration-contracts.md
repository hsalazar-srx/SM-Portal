# MOVEX-Portal - Integration Contracts

**Last Updated**: 2026-02-09  
**Status**: Draft (Phase 1)  
**Version**: 0.1.0

## 🔗 Integration Overview

MOVEX-Portal integrates with existing systems to execute M3 MOVEX transactions and enforce security/compliance requirements.

Primary integrations:
1. **movex-rest-api** (M3 integration layer)
2. **Active Directory** (authentication/authorization)
3. **SQL Server** (audit log storage)

---

## 1) movex-rest-api (M3 Integration Layer)

**Owner**: Integration Team  
**Location**: `C:\Projects\MOVEX\API-Integration\movex-rest-api`  
**Protocol**: HTTP/JSON  
**Auth**: API Key (scoped, expiring)

### Endpoint Contract (Portal → movex-rest-api)

- **Base URL**: `http://srxwebapp1:5000`
- **Timeout**: 30 seconds
- **Retry Policy**: 3 retries with exponential backoff

### Request Pattern (Abstract)
```json
{
  "program": "MMS175MI",
  "transaction": "Update",
  "inputs": {
    "WHLO": "100",
    "ITNO": "ITEM001",
    "WHSL": "RECV01",
    "TWSL": "PROD05",
    "TRQT": 10.0
  }
}
```

### Response Pattern (Abstract)
```json
{
  "success": true,
  "data": {
    "message": "Transaction complete",
    "raw": "..."
  },
  "errors": []
}
```

**Notes**:
- All inputs validated by MOVEX-Portal before execution.
- Response parsing uses `integration/m3-response-parser`.

---

## 2) Active Directory (Authentication & RBAC)

**Owner**: Infrastructure Team  
**Domain**: `SRXGLOBAL.COM`  
**Protocol**: LDAP / Kerberos

### Contract
- Portal uses **Windows Integrated Authentication** via IIS.
- User group memberships mapped to application roles via `rbac-config.json`.

### RBAC Mapping (Example)
```json
{
  "role": "Inventory_Write",
  "adGroups": ["SRX-Inventory-Managers"],
  "allowedEndpoints": ["update-qty", "move-item"]
}
```

---

## 3) SQL Server (Audit Logging)

**Owner**: Data Platform Team  
**Server**: `SRXDB01`  
**Database**: `MovexPortal_Audit`  
**Auth**: Windows Authentication

### Audit Record Contract (Abstract)
```json
{
  "timestamp": "2026-02-04T10:30:00Z",
  "user": "DOMAIN\\jsmith",
  "endpoint": "MMS175MI/Update",
  "riskLevel": "HIGH",
  "input": {"ITNO": "ITEM001", "TRQT": "***"},
  "result": "SUCCESS",
  "durationMs": 234
}
```

**Requirements**:
- Immutable audit table (append-only)
- Retention by risk level (CRITICAL=7y, HIGH=3y, MEDIUM=1y, LOW=90d)
- Encryption at rest (TDE enabled)

---

## ✅ Integration Contract Status

| Integration | Status | Owner | Notes |
|------------|--------|-------|-------|
| movex-rest-api | Draft | Integration Team | Reuse existing API contracts |
| Active Directory | Draft | Infrastructure Team | Uses Windows Auth + AD group mapping |
| SQL Server | Draft | Data Platform Team | Audit schema to be finalized |

---

## Next Steps

1. Confirm movex-rest-api endpoint registry contract format
2. Finalize audit schema with SQL Server team
3. Validate RBAC group naming conventions with AD administrators

---

**Related Skills**: `integration/m3-transaction-builder`, `integration/m3-response-parser`, `architecture/audit-logging-framework`, `architecture/rbac-endpoint-control`