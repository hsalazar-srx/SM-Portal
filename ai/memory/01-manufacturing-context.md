# Manufacturing Context - M3 MOVEX Integration

**Last Updated**: 2026-02-03  
**Domain**: Discrete Manufacturing (Different Devices)  
**ERP System**: Infor M3 RPG 12.4, not patched since 2006
AES400 R7v4

## 🏭 Business Context

### Company Profile

- **Industry**: Discrete manufacturing 
- **ERP**: Infor M3 RPG 12.4,  on IBM iSeries (AS/400) R7v4 not patched since 2006
- **Users**: ~200 staff across warehouse, production, planning, finance
- **Locations**: Multiple warehouses, production facilities
- **Annual Transactions**: ~500K inventory movements, ~100K production orders

### Key Business Processes

1. **Inventory Management**
   - Stock transfers between warehouses/locations
   - Cycle counting and adjustments
   - Serial/lot tracking for traceability

2. **Production Planning**
   - Item master management
   - BOM (Bill of Materials) maintenance
   - Production order creation/tracking

3. **Financial Operations**
   - Invoice processing
   - GL postings
   - Cost accounting

## 🔧 M3 MOVEX Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    IBM iSeries (AS/400)                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              M3 MOVEX Database (Db2)                 │   │
│  │  - Material Master (MITMAS, MITBAL, MITLOC)        │   │
│  │  - Production Orders (MWOHED, MWOOPE)               │   │
│  │  - Financials (FGLEDG, OINVOH)                      │   │
│  └──────────────────────────────────────────────────────┘   │
│                            ↕                                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │               M3 Business Engine                     │   │
│  │  - Transaction processing                            │   │
│  │  - Business rules validation                         │   │
│  └──────────────────────────────────────────────────────┘   │
│                            ↕                                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           M3 MI (Machine Interface) Server           │   │
│  │  - TCP/IP socket listener (port 6300)               │   │
│  │  - Exposes programs: MMS*, MOS*, OIS*, etc.          │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↕ (TCP/IP)
┌─────────────────────────────────────────────────────────────┐
│                       SRXWEBAPP1                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              movex-rest-api (IIS)                    │   │
│  │  - Connection pool                                   │   │
│  │  - Transaction builder                               │   │
│  │  - Response parser                                   │   │
│  └──────────────────────────────────────────────────────┘   │
│                            ↕                                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              MOVEX-Portal (IIS)                      │   │
│  │  - RBAC enforcement                                  │   │
│  │  - Audit logging                                     │   │
│  │  - Portal UI                                         │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↕ (HTTPS)
                    Internal Users (AD Auth)
```

### M3 MI Programs Used

| Program    | Purpose                    | Risk Level | Portal Exposure |
|------------|----------------------------|------------|----------------|
| **MMS175MI** | Item movement/transfers    | HIGH       | ✓ Phase 1      |
| **MMS200MI** | Item master data          | MEDIUM     | ✓ Phase 1      |
| **MMS310MI** | Item creation/updates     | HIGH       | ⏳ Phase 2     |
| **MMS850MI** | Production orders         | HIGH       | ⏳ Phase 2     |
| **OIS350MI** | Invoice processing        | CRITICAL   | ⏳ Phase 3     |

## 📋 Key M3 Data Structures

### Item Master (MITMAS)

| Field | Name                  | Type      | Description                    |
|-------|-----------------------|-----------|--------------------------------|
| CONO  | Company               | N3        | Company number (300)           |
| ITNO  | Item Number           | A15       | Unique item identifier         |
| ITDS  | Description           | A30       | Item description               |
| STAT  | Status                | N2        | 10=planned, 20=active, 90=inactive |
| ITTY  | Item Type             | A3        | 030=purchased, 040=manufactured |
| UNMS  | Unit of Measure       | A3        | EA, KG, M, etc.                |

### Item Balance (MITBAL)

| Field | Name                  | Type      | Description                    |
|-------|-----------------------|-----------|--------------------------------|
| CONO  | Company               | N3        | Company number                 |
| WHLO  | Warehouse             | A3        | Warehouse identifier           |
| ITNO  | Item Number           | A15       | Item                           |
| STQT  | On-Hand Quantity      | N17.6     | Current stock quantity         |
| ALQT  | Allocated Quantity    | N17.6     | Reserved for orders            |
| AVQT  | Available Quantity    | N17.6     | STQT - ALQT                    |

### Location Balance (MITLOC)

| Field | Name                  | Type      | Description                    |
|-------|-----------------------|-----------|--------------------------------|
| CONO  | Company               | N3        | Company number                 |
| WHLO  | Warehouse             | A3        | Warehouse                      |
| WHSL  | Location              | A10       | Specific bin/location          |
| ITNO  | Item Number           | A15       | Item                           |
| STQT  | Quantity              | N17.6     | Quantity at location           |

## 🔄 Common Business Workflows

### Workflow 1: Item Movement (MMS175)

**Business Need**: Move inventory from receiving location to production location

**M3 Transaction**: MMS175MI/Update

**Steps**:
1. User selects warehouse and item
2. Portal validates item exists and has sufficient quantity
3. User enters FROM location, TO location, quantity
4. Portal builds MMS175 transaction:
   ```
   WHLO=100
   ITNO=DC210055
   WHSL=RECV01
   TWSL=PROD05
   TRQT=10.0
   ```
5. M3 processes movement (updates MITLOC balances)
6. Portal displays success confirmation
7. Audit log records WHO moved WHAT from WHERE to WHERE

**Validation Rules**:
- Item must exist and be active (STAT=20)
- FROM location must have sufficient quantity (STQT >= TRQT)
- TO location must be valid for the warehouse
- Quantity must be positive

### Workflow 2: Item Lookup (MMS200)

**Business Need**: Check item details before placing order

**M3 Transaction**: MMS200MI/GetItmBasic

**Steps**:
1. User enters item number
2. Portal calls MMS200MI/GetItmBasic
3. M3 returns item master data
4. Portal displays formatted information

**Use Cases**:
- Verify item status before ordering
- Check unit of measure
- Confirm item type (purchased vs. manufactured)

## 🚨 Critical Business Rules

### Data Integrity

1. **Company Consistency**
   - All transactions MUST use same company (CONO=300)
   - Multi-company operations not supported in Phase 1

2. **Location Validation**
   - Cannot move to/from invalid locations
   - Some locations are system-reserved (cannot be used)

3. **Quantity Precision**
   - M3 supports 6 decimal places (e.g., 10.123456)
   - Portal should validate precision to avoid rounding errors

### Operational Constraints

1. **Transaction Timing**
   - M3 batch jobs lock files nightly (11 PM - 2 AM)
   - Portal should display maintenance window warning

2. **Audit Requirements**
   - All inventory movements MUST be logged (ISO 27001)
   - Audit logs retained for 3 years (HIGH risk)

3. **Performance**
   - M3 MI server supports ~50 concurrent connections
   - Portal should limit concurrent requests per user

## 🔗 Integration Points

### Existing Integrations

1. **movex-rest-api**
   - Provides connection pool, transaction builder, response parser
   - MOVEX-Portal extends this with RBAC and UI

2. **Active Directory**
   - User authentication
   - Role/group membership for RBAC

3. **Db2 (iSeries)**
   - Optional: Direct queries for read-only lookups (faster than MI)
   - Audit log storage option

### Future Integrations

1. **WMS (Warehouse Management)**
   - Real-time inventory sync from scanners
   - Location barcode validation

2. **PLM (Product Lifecycle Management)**
   - Item creation workflow (portal → PLM → M3)
   - BOM synchronization

## 📚 M3 Reference Documentation

### Key Programs

- **MMS175MI** - Item transactions (movements, adjustments)
- **MMS200MI** - Item master data retrieval
- **MMS310MI** - Item maintenance (create, update, delete)
- **MMS850MI** - Production order management
- **OIS350MI** - Invoice processing

### Naming Conventions

- **Program Format**: `AAAnnnMI` (AAA=module, nnn=function number, MI=Machine Interface)
- **Field Naming**: Standard M3 field names (e.g., ITNO, WHLO, STQT)
- **Company**: Always 300 for SRX
- **Warehouses**: 100=Main, 200=Secondary, etc.

## 🎯 Manufacturing-Specific Requirements

### Traceability

- **Serial Numbers**: Some items require serial tracking (MITMAS.SERI=1)
- **Lot Numbers**: Batch tracking for materials (MITMAS.LOTN=1)
- **Expiry Dates**: Food/pharma compliance (not currently used)

### Costing

- **Average Cost**: FCAAVP file tracks cost per item/warehouse
- **Standard Cost**: Used for variance analysis
- **Cost Impact**: Movements between warehouses can trigger cost changes

### Production Planning

- **Lead Time**: MITMAS.LEAT (days to procure/manufacture)
- **Safety Stock**: Minimum stock levels to maintain
- **Reorder Point**: Trigger for automatic purchase requisitions

## 🔒 Security & Compliance

### Data Classification

- **PUBLIC**: Item descriptions, basic attributes
- **INTERNAL**: On-hand quantities, locations
- **CONFIDENTIAL**: Cost data, margins
- **RESTRICTED**: Financial transactions, GL postings

### Access Control

- **Warehouse Staff**: Read MITBAL, execute MMS175 (movements)
- **Production Planners**: Read/write MITMAS, execute MMS310 (item creation)
- **Finance Team**: Read cost data, execute OIS350 (invoices)
- **IT Admins**: Full access for troubleshooting

## 📖 See Also

- M3 Programs Used: `C:\Projects\MOVEX\API-Integration\movex-rest-api\analysis\movex-functions.csv`
- Transaction Examples: `C:\Projects\MOVEX\API-Integration\movex-rest-api\transactions\`
- Skills: `integration/m3-transaction-builder`, `integration/m3-response-parser`
