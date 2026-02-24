# Frontend

This directory contains the React SPA frontend for MOVEX Portal.

## Stack

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + CSS Variables
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Design System**: Custom Scanfil-inspired theme (see `context/design/style-guide.md`)

## Skills Implemented

- `architecture/ui-ux-best-practices` - Token-driven design system with accessibility

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   └── ui/           # shadcn/ui components (Button, Card, Alert)
│   ├── lib/              # Utilities (cn helper)
│   ├── styles/           # CSS tokens and themes
│   ├── App.tsx           # Main application shell
│   ├── main.tsx          # React entry point
│   └── index.css         # Global styles + Tailwind
├── public/               # Static assets
├── index.html            # HTML entry point
└── vite.config.ts        # Vite configuration
```

## Design Tokens

All design tokens are defined in `src/styles/tokens.css` and mapped to Tailwind config. This ensures a single source of truth for theming.

## Accessibility

- Keyboard navigation with visible focus rings
- WCAG AA contrast compliance
- Semantic HTML
- ARIA labels where appropriate

## Next Steps

1. Implement routing (React Router)
2. Add API client for backend integration
3. Create endpoint list and form components
4. Implement RBAC-aware UI elements
5. Add authentication flow
