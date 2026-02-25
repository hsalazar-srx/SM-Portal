# SM-Portal (Scanfil Melbourne Portal) - Quick Reference Card

**Print this and keep at your desk!** 📌

**Version**: 0.2.0 | **Status**: ✅ Frontend Complete

## 📍 Location
```
C:\Projects\MOVEX-Portal\  # (Folder rename optional)
```

## 🎯 What Is This?
Scanfil Melbourne Portal (SM-Portal) - secure web portal exposing M3 MOVEX endpoints to internal users with RBAC, audit logging, and ISO 27001 compliance.

## 🎨 Frontend Status (COMPLETE - Feb 25)

✅ **Design System** - 8px spacing grid, semantic colors, fluid typography, transitions
✅ **Component Library** - Input, Textarea, Select, Badge, Tabs, Spinner, Stats, Card, Drawer, Alert
✅ **Responsive Pages** - SignIn, WelcomePage, ComponentShowcase (/components route)
✅ **Mobile Navigation** - Hamburger menu (mobile) + desktop nav in ResponsiveHeader
✅ **Touch Optimization** - 44px+ targets, 16px base font, responsive layouts

## 📋 Backend Skills (Planned)

### Architecture (3 skills)
- 📋 **rbac-endpoint-control** - Role-based access control for endpoint exposure
- 📋 **audit-logging-framework** - ISO 27001-compliant audit logging
- 📋 **generic-endpoint-executor** - Config-driven M3 endpoint execution

### Integration (2 skills - reused from movex-rest-api)
- ✓ **m3-transaction-builder** - Build M3 API transaction configs
- ✓ **m3-response-parser** - Parse M3 responses with type conversion

## 🚀 Quick Commands

### Frontend - Local Development
```powershell
cd C:\Projects\MOVEX-Portal\frontend
npm install      # Install dependencies (first time)
npm run dev     # Start dev server → http://localhost:5173
npm run build   # Production build
```

### View Frontend Components
```
Once dev server running:
- http://localhost:5173              ← SignIn/WelcomePage
- http://localhost:5173/components   ← Interactive showcase
```

### View Backend Skills Documentation
```powershell
# RBAC skill
cat C:\Projects\.github\skills\architecture\rbac-endpoint-control\skill.md

# Audit logging skill
cat C:\Projects\.github\skills\architecture\audit-logging-framework\skill.md

# Generic executor skill
cat C:\Projects\.github\skills\architecture\generic-endpoint-executor\skill.md
```

### Navigate Project
```powershell
# Open project index
cat C:\Projects\MOVEX-Portal\INDEX.md

# View AI guidelines
cat C:\Projects\MOVEX-Portal\ai\rules.md

# See product vision
cat C:\Projects\MOVEX-Portal\ai\memory\00-product-vision.md

# M3 integration context
cat C:\Projects\MOVEX-Portal\ai\memory\01-manufacturing-context.md
```

### Development (When Ready)
```powershell
cd C:\Projects\MOVEX-Portal
dotnet build
dotnet run
```

## 📖 Documentation Map

| File | Purpose |
|------|---------|
| `README.md` | Project overview and setup |
| `INDEX.md` | Navigation and quick links |
| `ai/rules.md` | AI agent development guidelines |
| `ai/memory/00-product-vision.md` | Goals, users, roadmap |
| `ai/memory/01-manufacturing-context.md` | M3 MOVEX integration details |

## 🏗️ Architecture

```
Portal UI → Generic Executor → RBAC Check → Field Validation → 
Transaction Builder → M3 Socket → Response Parser → Audit Log
```

## 🎓 Key Concepts

### Config-Driven Design
- Endpoints defined in JSON (`config/endpoint-registry.json`)
- RBAC roles in JSON (`config/rbac-config.json`)
- No code changes to add endpoints

### RBAC Enforcement
- Users authenticate via Windows AD
- AD groups mapped to application roles
- Middleware enforces permissions before execution

### Audit Trail
- Every call logged: WHO, WHAT, WHEN, RESULT
- Immutable audit events
- ISO 27001 compliant

## 📋 Configuration Files

```powershell
# Endpoint registry (defines exposed endpoints)
C:\Projects\MOVEX-Portal\src\config\endpoint-registry.json

# RBAC configuration (AD group mapping)
C:\Projects\MOVEX-Portal\src\config\rbac-config.json

# Audit retention policies
C:\Projects\MOVEX-Portal\src\config\audit-retention-policy.json
```

## 🔍 Find Related Projects

```powershell
# MOVEX REST API (shared components)
cd C:\Projects\MOVEX\API-Integration\movex-rest-api

# Skills Registry
cd C:\Projects\.github\skills

# SRX Project Template
cd C:\Projects\IT-Strategy\foundation\templates\srx-project-template
```

## 🔒 Security Checklist

- [ ] Windows AD authentication enabled
- [ ] RBAC middleware registered
- [ ] Audit logging middleware registered
- [ ] Sensitive fields masked in logs
- [ ] Endpoint registry validated
- [ ] AD group mapping tested
- [ ] Audit log retention configured

## ✨ Current Status

**Phase**: Pre-Alpha (Design)  
**Skills Created**: 3/3 architecture skills  
**Project Structure**: ✓ Complete  
**Implementation**: 📋 Planned for Q1 2026  
**Version**: 0.1.0

## 📞 Support

- **Skills**: `C:\Projects\.github\skills\`
- **AI Context**: `C:\Projects\MOVEX-Portal\ai\memory\`
- **Guidelines**: `C:\Projects\MOVEX-Portal\ai\rules.md`

---

**Last Updated**: 2026-02-03  
**Project**: MOVEX-Portal  
**Skills-Based Architecture**: ✅ Active
