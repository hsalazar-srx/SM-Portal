/**
 * MOVEX-Portal Design System
 * Based on Impeccable principles: constraint-driven, minimal, cohesive
 * 
 * Core Principle: 8px base unit grid for all spacing
 * Colors: Semantic tokens for maintainability
 * Typography: Fluid sizing (responsive without breakpoints)
 */

// Spacing Scale (8px base unit)
export const spacing = {
  xs: '0.25rem',  // 4px
  sm: '0.5rem',   // 8px
  md: '1rem',     // 16px
  lg: '2rem',     // 32px
  xl: '4rem',     // 64px
  '2xl': '8rem',  // 128px
} as const;

// Color Semantic Tokens
export const colors = {
  // Primary (for main actions, focus states)
  primary: {
    50: '#f0f7ff',
    100: '#e0f0ff',
    200: '#c2e0ff',
    600: '#0066cc',
    700: '#0052a3',
  },
  // Neutral (for text, backgrounds, dividers)
  neutral: {
    0: '#ffffff',
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    400: '#9ca3af',
    600: '#4b5563',
    900: '#1a202c',
  },
  // Status colors
  status: {
    success: '#10b981',  // Green
    warning: '#f59e0b',  // Amber
    error: '#ef4444',    // Red
    info: '#3b82f6',     // Blue
  },
} as const;

// Typography Scale (fluid sizing with clamp)
export const typography = {
  // Display: 32px @ 1024px → 48px @ 1440px
  display: {
    fontSize: 'clamp(32px, 6vw, 48px)',
    lineHeight: '1.2',
    fontWeight: 700,
  },
  // Heading 1: 28px → 42px
  h1: {
    fontSize: 'clamp(28px, 5vw, 42px)',
    lineHeight: '1.25',
    fontWeight: 700,
  },
  // Heading 2: 24px → 36px
  h2: {
    fontSize: 'clamp(24px, 4vw, 36px)',
    lineHeight: '1.3',
    fontWeight: 600,
  },
  // Heading 3: 20px → 28px
  h3: {
    fontSize: 'clamp(20px, 3vw, 28px)',
    lineHeight: '1.4',
    fontWeight: 600,
  },
  // Body: 16px (constant, high readability)
  body: {
    fontSize: '1rem',
    lineHeight: '1.6',
    fontWeight: 400,
  },
  // Small: 14px
  sm: {
    fontSize: '0.875rem',
    lineHeight: '1.5',
    fontWeight: 400,
  },
  // Caption: 12px
  caption: {
    fontSize: '0.75rem',
    lineHeight: '1.4',
    fontWeight: 500,
  },
} as const;

// Breakpoints (aligned with Tailwind)
export const breakpoints = {
  xs: '0px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// Border Radius (constraint-based)
export const borderRadius = {
  none: '0',
  sm: '0.25rem',    // 4px
  md: '0.5rem',     // 8px
  lg: '1rem',       // 16px
  full: '9999px',
} as const;

// Shadows (semantic)
export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
} as const;

// Z-index scale (constraint-based)
export const zIndex = {
  hide: '-1',
  auto: 'auto',
  base: '0',
  dropdown: '1000',
  sticky: '1020',
  fixed: '1030',
  modalBackdrop: '1040',
  modal: '1050',
  popover: '1060',
  tooltip: '1070',
} as const;

// Transitions (purposeful, minimal motion)
export const transitions = {
  fast: '150ms ease-in-out',
  normal: '250ms ease-in-out',
  slow: '350ms ease-in-out',
} as const;
