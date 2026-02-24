**Scope:** Light theme first, with an optional dark mode toggle you can enable later. All values come from your uploaded image; no external data used.

**Status:** ✅ Approved (2026-02-09)  
**Approved By:** IT Manager  
**Decision Record:** `ai/evidence/decision-003-style-guide-approval.md`  
**Change Impact:** `ai/evidence/change-impact-006-style-guide-approval.md`

## 0) Project Assumptions

*   React SPA (Vite or CRA; examples use Vite folder conventions)
*   Tailwind v3.4+
*   shadcn/ui installed (i.e., `npx shadcn@latest init`), using `class-variance-authority` (CVA) utilities
*   CSS variables used as the **single source of truth** for theming

## 1) Design Tokens (CSS Variables)

Create or update `src/styles/tokens.css` and import it once in your app (e.g., in `main.tsx` or `index.css` after Tailwind’s base).

```css
/* src/styles/tokens.css */

:root {
  /* Brand */
  --color-primary: #003A70;        /* Brand blue (logo/nav/CTA) */
  --color-primary-600: #0A516D;    /* Deep teal (cards/sections) */
  --color-primary-300: #5BA2B4;    /* Light teal (accent lines) */

  /* Supporting */
  --color-success: #1F8A5B;
  --color-warning: #C98A00;
  --color-danger:  #C73D3D;
  --color-info:    #2F6FA3;

  /* Neutrals */
  --color-bg: #FFFFFF;             /* App background */
  --color-surface: #F2F3F2;        /* Cards/panels */
  --color-outline: #D8DADA;        /* Dividers/borders */
  --color-text: #0F2D40;           /* Primary text */
  --color-text-weak: #6A6F72;      /* Secondary text */
  --color-overlay: 0,0,0;          /* as RGB tuple for alpha usage */

  /* Typography scale (rem) */
  --font-sans: "Inter","Roboto","Helvetica Neue",Arial,sans-serif;
  --font-mono: ui-monospace,SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace;
  --lh-heading: 1.25;
  --lh-body: 1.5;

  --fs-display: 2.25rem;
  --fs-h1: 1.75rem;
  --fs-h2: 1.5rem;
  --fs-h3: 1.25rem;
  --fs-body: 1rem;
  --fs-body-sm: 0.9375rem;
  --fs-caption: 0.8125rem;

  /* Radius */
  --radius-lg: 24px; /* pill */
  --radius-md: 12px; /* inputs/cards */
  --radius-sm: 8px;

  /* Shadows */
  --shadow-1: 0 1px 2px rgba(0,0,0,.06), 0 2px 8px rgba(0,0,0,.04);
  --shadow-2: 0 8px 24px rgba(0,0,0,.18);

  /* Focus ring color */
  --ring-blue: 0, 58, 112; /* #003A70 as RGB */
}

/* Optional: Dark mode (data-theme="dark") – tune later when you introduce a toggle */
[data-theme="dark"] {
  --color-bg: #0B1216;
  --color-surface: #111A20;
  --color-outline: #25313A;
  --color-text: #E7EEF3;
  --color-text-weak: #9FB1BD;

  /* Keep brand blues; optionally nudge for dark */
  --color-primary: #2C6AA1;
  --color-primary-600: #105771;
  --color-primary-300: #6CB9CA;

  --shadow-1: 0 1px 2px rgba(0,0,0,.35), 0 8px 20px rgba(0,0,0,.4);
  --shadow-2: 0 16px 48px rgba(0,0,0,.55);
}
```

## 2) Tailwind Setup

### 2.1 `tailwind.config.ts`

Map Tailwind tokens to your CSS variables. This ensures **shadcn/ui** components that use Tailwind classes will pick up your theme.

```ts
// tailwind.config.ts
import type { Config } from "tailwindcss";

export default {
  darkMode: ["class", '[data-theme="dark"]'], // allow either .dark class or data-theme
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx,js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand
        primary: {
          DEFAULT: "var(--color-primary)",
          600: "var(--color-primary-600)",
          300: "var(--color-primary-300)",
          fg: "#FFFFFF",
        },
        // Supporting
        success: "var(--color-success)",
        warning: "var(--color-warning)",
        danger:  "var(--color-danger)",
        info:    "var(--color-info)",

        // Neutrals
        bg: "var(--color-bg)",
        surface: "var(--color-surface)",
        outline: "var(--color-outline)",
        text: {
          DEFAULT: "var(--color-text)",
          weak: "var(--color-text-weak)",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
      boxShadow: {
        elev1: "var(--shadow-1)",
        elev2: "var(--shadow-2)",
      },
      borderRadius: {
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        sm: "var(--radius-sm)",
      },
      ringColor: {
        blue: "rgb(var(--ring-blue))",
      },
      // Spacing scale – optional sugar on 8px base
      spacing: {
        1: "4px",
        2: "8px",
        3: "12px",
        4: "16px",
        5: "24px",
        6: "32px",
        7: "40px",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"), // recommended by shadcn
  ],
} satisfies Config;
```

### 2.2 Global Base Styles

Update your main stylesheet (e.g., `src/index.css`) to include Tailwind layers and import tokens:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@import "./styles/tokens.css";

/* Base defaults aligned to tokens */
@layer base {
  :root {
    color-scheme: light;
  }
  [data-theme="dark"] {
    color-scheme: dark;
  }

  html, body, #root {
    height: 100%;
    background: var(--color-bg);
    color: var(--color-text);
    font-family: var(--font-sans);
    line-height: var(--lh-body);
  }

  h1, h2, h3 {
    line-height: var(--lh-heading);
  }
  h1 { font-size: var(--fs-h1); font-weight: 700; }
  h2 { font-size: var(--fs-h2); font-weight: 600; }
  h3 { font-size: var(--fs-h3); font-weight: 600; }

  .focus-ring {
    @apply outline-none ring-2 ring-offset-2;
    --tw-ring-color: rgb(var(--ring-blue));
    --tw-ring-offset-color: var(--color-bg);
  }
}
```

## 3) shadcn/ui Theming

shadcn/ui uses Tailwind classes + CSS variables and is unopinionated about colors. We’ll define a minimal **design‑token bridge** so the generated components (Button, Card, Alert, etc.) read from your palette.

### 3.1 Component Tokens (semantic)

Create `src/styles/shadcn-theme.css`:

```css
/* src/styles/shadcn-theme.css */
/* Semantic tokens shadcn/ui components can use via var(...) */

:root {
  /* Foregrounds */
  --scn-fg: var(--color-text);
  --scn-fg-muted: var(--color-text-weak);
  --scn-fg-inverted: #FFFFFF;

  /* Surfaces */
  --scn-bg: var(--color-bg);
  --scn-surface: var(--color-surface);
  --scn-border: var(--color-outline);

  /* Brand */
  --scn-primary: var(--color-primary);
  --scn-primary-600: var(--color-primary-600);
  --scn-primary-300: var(--color-primary-300);

  /* States */
  --scn-success: var(--color-success);
  --scn-warning: var(--color-warning);
  --scn-danger:  var(--color-danger);
  --scn-info:    var(--color-info);
}

/* Dark maps the same semantics to dark variables */
[data-theme="dark"] {
  --scn-fg: var(--color-text);
  --scn-fg-muted: var(--color-text-weak);
  --scn-fg-inverted: #0B1216;

  --scn-bg: var(--color-bg);
  --scn-surface: var(--color-surface);
  --scn-border: var(--color-outline);

  --scn-primary: var(--color-primary);
  --scn-primary-600: var(--color-primary-600);
  --scn-primary-300: var(--color-primary-300);

  --scn-success: var(--color-success);
  --scn-warning: var(--color-warning);
  --scn-danger:  var(--color-danger);
  --scn-info:    var(--color-info);
}
```

Import this CSS after `tokens.css` (e.g., also from `index.css`).

## 4) Component Recipes (shadcn/ui + Tailwind)

Below are **ready‑to‑use customizations** for the most common components, aligned to the look-and-feel you extracted.

### 4.1 Button (primary, secondary, tertiary)

`src/components/ui/button.tsx` (override the default shadcn Button or create your own variant)

```tsx
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/** Pill primary look, outline secondary, link tertiary */
const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap transition-colors focus-visible:focus-ring disabled:opacity-40 disabled:pointer-events-none",
  {
    variants: {
      variant: {
        primary:
          "bg-[var(--scn-primary)] text-[var(--scn-fg-inverted)] shadow-elev1 hover:brightness-[.94] active:brightness-[.9] rounded-[var(--radius-lg)]",
        secondary:
          "border border-[var(--scn-primary)] text-[var(--scn-primary)] hover:bg-[color-mix(in_oKlab,white, var(--scn-primary) 8%)] rounded-[var(--radius-lg)]",
        tertiary:
          "text-[var(--scn-primary)] hover:underline rounded-[var(--radius-sm)]",
        destructive:
          "bg-[var(--scn-danger)] text-white hover:brightness-[.94] rounded-[var(--radius-lg)]",
      },
      size: {
        lg: "h-12 px-6 text-base",
        md: "h-10 px-5 text-sm",
        sm: "h-8 px-4 text-sm",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
```

Usage:

```tsx
<Button>Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="tertiary">Tertiary</Button>
<Button variant="destructive">Delete</Button>
```

### 4.2 Card with “Scanfil header strip”

`src/components/ui/card.tsx`

```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-surface rounded-md shadow-elev1 border border-outline",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeaderStrip({
  title,
  children,
}: { title?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-t-md bg-[var(--color-primary-600)] text-white p-5">
      {/* geometric overlay lines */}
      <svg
        className="absolute inset-0 opacity-35"
        viewBox="0 0 600 200"
        aria-hidden="true"
      >
        <g fill="none" stroke="var(--color-primary-300)" strokeWidth="4">
          <rect x="340" y="30" width="220" height="140" rx="4" />
          <rect x="300" y="20" width="220" height="140" rx="4" />
          <rect x="260" y="10" width="220" height="140" rx="4" />
        </g>
      </svg>
      <div className="relative z-10">
        {title && <h3 className="text-white font-semibold text-lg">{title}</h3>}
        {children}
      </div>
    </div>
  );
}

export function CardBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-6", className)} {...props} />;
}
```

Usage:

```tsx
<Card className="max-w-xl">
  <CardHeaderStrip title="Scanfil’s Outlook for 2026" />
  <CardBody>
    <p className="text-text">Body copy on a neutral surface.</p>
  </CardBody>
</Card>
```

### 4.3 Alert (Info/Success/Warning/Error)

`src/components/ui/alert.tsx`

```tsx
import { cn } from "@/lib/utils";

type Kind = "info" | "success" | "warning" | "danger";

const map = {
  info:    { border: "var(--color-info)",    bg: "rgba(47,111,163,.12)",  fg: "var(--color-text)" },
  success: { border: "var(--color-success)", bg: "rgba(31,138,91,.12)",   fg: "var(--color-text)" },
  warning: { border: "var(--color-warning)", bg: "rgba(201,138,0,.12)",   fg: "var(--color-text)" },
  danger:  { border: "var(--color-danger)",  bg: "rgba(199,61,61,.12)",   fg: "var(--color-text)" },
};

export function Alert({
  kind = "info",
  title,
  children,
  className,
}: {
  kind?: Kind;
  title?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const k = map[kind];
  return (
    <div
      className={cn(
        "rounded-md border p-4",
        className
      )}
      style={{
        borderColor: k.border,
        background: k.bg,
        color: k.fg,
      }}
      role="status"
    >
      {title && <div className="font-semibold mb-1">{title}</div>}
      <div className="text-text-weak">{children}</div>
    </div>
  );
}
```

## 5) Typography Utilities

Use utility classes or small helpers to match the scale:

```tsx
export const H1 = (p: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h1 {...p} className={cn("text-[var(--fs-h1)] font-bold leading-[var(--lh-heading)]", p.className)} />
);
export const H2 = (p: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h2 {...p} className={cn("text-[var(--fs-h2)] font-semibold leading-[var(--lh-heading)]", p.className)} />
);
export const Muted = (p: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p {...p} className={cn("text-text-weak text-[var(--fs-body-sm)]", p.className)} />
);
```

*(Or just use Tailwind text sizes; the variables are there to keep the scale centralized.)*

## 6) Layout & Spacing

*   **Grid base:** 8px (use Tailwind spacing `2,3,4,5,6,7` we defined)
*   **Containers:** `max-w-[1200px] mx-auto px-5 lg:px-7`
*   **Sections:** `py-7 lg:py-10`
*   **Card padding:** `p-5 lg:p-6`
*   **Gaps:** inline `gap-2` (8px), stacks `gap-3/4` (12/16px)

Example page section:

```tsx
<section className="py-10 bg-bg">
  <div className="max-w-[1200px] mx-auto px-5 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
    {/* <Card/>s here */}
  </div>
</section>
```

## 7) Accessibility Defaults

Add a helper for keyboard focus across interactive elements:

```tsx
/* usage: className="focus-ring" on <button>, <a>, <input> */
```

*   **Contrast:** Prefer primary on white or white on primary; both exceed AA in typical sizes.
*   **Touch targets:** Ensure interactive items are ≥ `h-10` (`40px`).
*   **Reduced motion:** optionally include `@media (prefers-reduced-motion: reduce)` in components with transitions.

## 8) Example App Shell

`src/App.tsx`

```tsx
import { Button } from "@/components/ui/button";
import { Card, CardHeaderStrip, CardBody } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";

export default function App() {
  return (
    <div className="min-h-dvh bg-bg text-text">
      <header className="sticky top-0 z-40 bg-bg border-b border-outline">
        <div className="max-w-[1200px] mx-auto px-5 h-16 flex items-center justify-between">
          <div className="text-primary font-bold text-lg tracking-tight">SCANFIL • In‑House</div>
          <nav className="flex items-center gap-4">
            #Services</a>
            #Industries</a>
            <Button className="ml-2">Contact Us</Button>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero strip */}
        <div className="bg-[var(--color-primary-600)] text-white">
          <div className="max-w-[1200px] mx-auto px-5 py-10">
            <h1 className="text-white text-3xl font-semibold">Welcome</h1>
            <p className="opacity-80 mt-2">A clean, manufacturing‑grade UI kit.</p>
          </div>
        </div>

        {/* Cards grid */}
        <section className="py-10">
          <div className="max-w-[1200px] mx-auto px-5 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1,2,3].map(i => (
              <Card key={i}>
                <CardHeaderStrip title={`Article ${i}`} />
                <CardBody>
                  <p className="mb-4">Scanfil‑style card body on neutral surface.</p>
                  <Button size="sm">Read more</Button>
                </CardBody>
              </Card>
            ))}
          </div>
        </section>

        <section className="max-w-[1200px] mx-auto px-5 pb-16 space-y-4">
          <Alert kind="info" title="Information">
            Meta/date text should use the weak color.
          </Alert>
          <Alert kind="success" title="Success">Saved successfully.</Alert>
          <Alert kind="warning" title="Warning">Caution advised.</Alert>
          <Alert kind="danger" title="Error">Something went wrong.</Alert>
        </section>
      </main>

      <footer className="bg-surface border-t border-outline">
        <div className="max-w-[1200px] mx-auto px-5 py-6 text-text-weak text-sm">
          © {new Date().getFullYear()} SRX • Internal
        </div>
      </footer>
    </div>
  );
}
```

## 9) Utilities & Helpers

### 9.1 `cn` helper (if not already present)

```ts
// src/lib/utils.ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### 9.2 Theme Toggle (optional)

```tsx
// Example: toggle data-theme on <html>
export function toggleTheme() {
  const el = document.documentElement;
  const current = el.getAttribute("data-theme");
  el.setAttribute("data-theme", current === "dark" ? "light" : "dark");
}
```

## 10) Content Patterns

*   **Dates / meta:** `text-text-weak text-[var(--fs-caption)]`
*   **Links:** `text-primary hover:underline`
*   **Interactive cards:** add `transition-shadow hover:shadow-elev2`

## 11) Tailwind Class Cheatsheet (mapped to tokens)

*   Backgrounds: `bg-bg`, `bg-surface`, `bg-[var(--color-primary-600)]`
*   Borders: `border-outline`, `border-[var(--color-primary)]`
*   Text: `text-text`, `text-text-weak`, `text-primary`
*   Shadows: `shadow-elev1`, `shadow-elev2`
*   Radius: `rounded-md` (12px), `rounded-lg` (24px)
*   Focus: add `focus-visible:focus-ring` (class defined in base layer)

## 12) Quality Gates (before shipping)

*   [ ] Keyboard navigation highlights with the blue ring on all actionable elements
*   [ ] Color combos pass WCAG AA for text/icons
*   [ ] Cards and CTAs mimic the Scanfil look (deep teal headers + light teal lines)
*   [ ] Token‑first usage (no hard‑coded colors in components unless derived from variables)

### Want me to generate the files?

I can bundle the above into a **zip** with:

*   `tokens.css`, `shadcn-theme.css`, `tailwind.config.ts`
*   `button.tsx`, `card.tsx`, `alert.tsx`, `utils.ts`
*   a minimal **Vite** React starter wired with Tailwind and shadcn/ui.
