# SM-Portal (Scanfil Melbourne Portal) Frontend

**React 18 + TypeScript | Responsive Design System | Component Library**

**Version**: 0.2.0 | **Status**: ✅ Complete | **Last Updated**: Feb 25, 2026

---

## 🎯 Overview

Modern, responsive frontend for SM-Portal (Scanfil Melbourne Portal) with:
- ✅ Design system (8px spacing grid, semantic tokens, fluid typography)
- ✅ Component library (10+ reusable components)
- ✅ Mobile-first responsive design
- ✅ Touch-optimized forms and navigation
- ✅ Windows AD authentication flow
- ✅ Interactive component showcase

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ (with npm)
- A text editor (VS Code recommended)

### Development Server

```bash
cd C:\Projects\MOVEX-Portal\frontend

# First time: install dependencies
npm install

# Start dev server
npm run dev

# Output: http://localhost:5173
```

Visit your browser:
- **Home (SignIn/WelcomePage)**: http://localhost:5173
- **Component Showcase**: http://localhost:5173/components

### Production Build

```bash
npm run build      # Creates dist/ folder
npm run preview    # Preview production build locally
```

---

## 🎨 Design System

### Tokens (`src/styles/tokens.css`)

**Spacing** (8px base unit):
```css
--space-xs: 4px      /* 0.25rem */
--space-sm: 8px      /* 0.5rem */
--space-md: 16px     /* 1rem */
--space-lg: 32px     /* 2rem */
--space-xl: 64px     /* 4rem */
```

**Colors**:
- **Primary**: Blue-500 (#3b82f6)
- **Neutral**: Gray scale (50-900)
- **Status**: Green (success), Orange (warning), Red (error), Blue (info)

**Typography**:
- **Display**: 3.5rem (56px), bold
- **H1-H3**: 2.25rem-1.5rem, bold/semibold
- **Body**: 1rem (16px), normal
- **Muted**: 0.875rem, gray-600
- **Caption**: 0.75rem, gray-500
- **Responsive**: Uses clamp() for smooth scaling

**Transitions**:
- Standard: 200ms ease-in-out
- Smooth: 300ms ease-in-out
- Fast: 100ms ease-in

---

## 📦 Component Library

All components use design tokens automatically and are fully responsive.

### Form Components (`src/components/ui/input.tsx`)

**Input**
```typescript
<Input
  label="Username"
  placeholder="Enter username"
  value={value}
  onChange={handleChange}
  error={errors.username}
  helperText="Your Windows domain username"
/>
```
- h-12 (48px) touch targets
- Validation states + error/helper text
- Optional disabled state

**Textarea & Select** - Similar API with appropriate features

### Navigation Components

**ResponsiveHeader** (`src/components/ResponsiveHeader.tsx`)
```typescript
<ResponsiveHeader userName="John Doe" userRole="Manager" onSignOut={handleSignOut} />
```
- Mobile (<md): Hamburger menu
- Desktop (md+): Horizontal navigation
- Smooth animations

**Tabs** (`src/components/ui/tabs.tsx`)
- Context-based state management
- Active/inactive styling
- Tabbed content display

**Drawer** (`src/components/ui/drawer.tsx`)
- Mobile sidebar with backdrop
- Used by ResponsiveHeader

### Feedback Components

**Badge** - 6 variants (primary, success, warning, error, info, neutral)
**Alert** - With variant and title support
**Spinner/LoadingState/Skeleton** - Various loading indicators

### Display Components

**Card** - With optional CardHeaderStrip overlay
**StatsCard/StatsGrid** - Metrics display with trend indicators
**Typography** - H1-H3, Display, Body, Muted, Caption, Code

---

## 📄 Pages

| Page | Route | Purpose |
|------|-------|---------|
| `SignIn.tsx` | `/` | Windows AD auth |
| `WelcomePage.tsx` | (after auth) | Home with role-based cards |
| `ComponentShowcase.tsx` | `/components` | Interactive component demo |

---

## 🔄 Responsive Design

### Breakpoints
- `sm`: 640px (small phones)
- `md`: 768px (tablets)
- `lg`: 1024px (desktops)

### Mobile-First Pattern
```typescript
// Default mobile, enhance for larger screens
<div className="px-md md:px-lg py-md md:py-lg">
  <h1 className="text-2xl md:text-3xl lg:text-4xl">Title</h1>
</div>
```

### Touch Optimization
- 44px+ touch targets (buttons/inputs: h-12)
- 16px base font on mobile (prevents iOS zoom)
- Consistent token-based spacing

---

## 🏗️ Project Structure

```
frontend/
├── src/
│   ├── App.tsx                      # React Router
│   ├── main.tsx                     # Entry point
│   ├── index.css                    # Global styles
│   │
│   ├── components/
│   │   ├── ui/                      # Reusable components
│   │   │   ├── input.tsx            # Input, Textarea, Select
│   │   │   ├── button.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── spinner.tsx
│   │   │   ├── stats.tsx
│   │   │   ├── card.tsx
│   │   │   ├── drawer.tsx
│   │   │   ├── alert.tsx
│   │   │   └── typography.tsx
│   │   │
│   │   └── ResponsiveHeader.tsx      # Smart header
│   │
│   ├── pages/
│   │   ├── SignIn.tsx
│   │   ├── WelcomePage.tsx
│   │   └── ComponentShowcase.tsx
│   │
│   ├── context/
│   │   └── AuthContext.tsx
│   │
│   └── styles/
│       ├── tokens.css               # Design tokens
│       └── index.css                # Imports
│
├── public/
├── package.json
├── tailwind.config.ts
└── vite.config.ts
```

---

## 🔌 Backend Integration (Future)

Expected endpoints:
```typescript
POST /api/auth/login - Authenticate user
GET /api/auth/user - Get user profile
GET /api/endpoints - Get endpoint registry
```

Environment variables (`.env.local`):
```bash
VITE_API_BASE_URL=http://localhost:5000
VITE_API_TIMEOUT=30000
```

---

## 🚢 Deployment

### Static Hosting
```bash
npm run build
# Deploy dist/ folder to GitHub Pages, Vercel, Netlify, etc.
```

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package* ./
RUN npm ci
COPY . .
RUN npm run build
```

---

## 🔒 Security

- ✅ No hardcoded credentials (use .env.local)
- ✅ XSS protection (React auto-escapes)
- ✅ CSRF token handling (future, when backend ready)
- ✅ Secure headers via backend (CSP, X-Frame-Options)

---

## 🎯 Key Features

1. **Token-Driven Design** - All styles use CSS custom properties
2. **Constraint-Based Layout** - 8px base unit for consistency
3. **Fluid Typography** - clamp() for responsive text
4. **Mobile-First** - Works on all screens by default
5. **Custom Components** - No external UI library dependency
6. **Accessible** - WCAG AA compliant, semantic HTML

---

## 📚 Resources

- [React docs](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [React Router](https://reactrouter.com)
- [Vite](https://vitejs.dev)

---

## 📝 Contributing

### Code Style
- TypeScript for type safety
- PascalCase for components, camelCase for functions
- Mobile-first CSS (default mobile, then `md:` prefixes)
- Semantic HTML

### Adding Components
1. Create `src/components/ui/componentname.tsx`
2. Export with variants prop
3. Add to ComponentShowcase.tsx
4. Test on mobile

### Git Workflow
```bash
git add .
git commit -m "feat: Add new component"
git push
```

---

**Version**: 0.2.0 | **Status**: ✅ Complete | **Last Updated**: Feb 25, 2026
