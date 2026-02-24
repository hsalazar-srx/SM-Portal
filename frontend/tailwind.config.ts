import type { Config } from "tailwindcss";

export default {
  darkMode: ["class", '[data-theme="dark"]'],
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx,js,jsx}",
  ],
  theme: {
    extend: {
      /* === SPACING (8px constraint-based grid) === */
      spacing: {
        xs: 'var(--space-xs)',    /* 4px */
        sm: 'var(--space-sm)',    /* 8px */
        md: 'var(--space-md)',    /* 16px */
        lg: 'var(--space-lg)',    /* 32px */
        xl: 'var(--space-xl)',    /* 64px */
        '2xl': 'var(--space-2xl)', /* 128px */
      },

      /* === FONT SIZES (responsive, fluid) === */
      fontSize: {
        'display': ['var(--fs-display)', { lineHeight: 'var(--lh-tight)' }],
        'h1': ['var(--fs-h1)', { lineHeight: 'var(--lh-heading)' }],
        'h2': ['var(--fs-h2)', { lineHeight: 'var(--lh-heading)' }],
        'h3': ['var(--fs-h3)', { lineHeight: 'var(--lh-heading)' }],
        'body': ['var(--fs-body)', { lineHeight: 'var(--lh-body)' }],
        'body-sm': ['var(--fs-body-sm)', { lineHeight: 'var(--lh-body)' }],
        'caption': ['var(--fs-caption)', { lineHeight: '1.4' }],
      },

      /* === LINE HEIGHTS === */
      lineHeight: {
        'tight': 'var(--lh-tight)',
        'heading': 'var(--lh-heading)',
        'body': 'var(--lh-body)',
      },

      /* === COLORS (semantic tokens) === */
      colors: {
        // Primary
        primary: {
          '50': 'var(--color-primary-50)',
          '100': 'var(--color-primary-100)',
          '200': 'var(--color-primary-200)',
          DEFAULT: 'var(--color-primary)',
          '600': 'var(--color-primary-600)',
          '700': 'var(--color-primary-700)',
          'fg': 'var(--color-neutral-0)',
        },
        
        // Neutral palette
        neutral: {
          '0': 'var(--color-neutral-0)',
          '50': 'var(--color-neutral-50)',
          '100': 'var(--color-neutral-100)',
          '200': 'var(--color-neutral-200)',
          '400': 'var(--color-neutral-400)',
          '600': 'var(--color-neutral-600)',
          '900': 'var(--color-neutral-900)',
        },

        // Status colors
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        error: 'var(--color-error)',
        danger: 'var(--color-danger)',
        info: 'var(--color-info)',

        // Semantic aliases
        bg: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        outline: 'var(--color-outline)',
        text: {
          DEFAULT: 'var(--color-text)',
          weak: 'var(--color-text-weak)',
          muted: 'var(--color-text-muted)',
        },
      },

      /* === FONT FAMILY === */
      fontFamily: {
        sans: ['var(--font-sans)'],
        mono: ['var(--font-mono)'],
      },

      /* === BOX SHADOWS === */
      boxShadow: {
        none: 'var(--shadow-none)',
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        xl: 'var(--shadow-xl)',
        elev1: 'var(--shadow-sm)',
        elev2: 'var(--shadow-md)',
      },

      /* === BORDER RADIUS === */
      borderRadius: {
        none: 'var(--radius-none)',
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        full: 'var(--radius-full)',
      },

      /* === RING COLOR === */
      ringColor: {
        blue: 'rgb(var(--ring-blue))',
      },

      /* === TRANSITIONS === */
      animation: {
        fadeIn: 'fadeIn 0.3s ease-in-out',
        slideDownAndFade: 'slideDownAndFade 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
      },
      transitionDuration: {
        fast: 'var(--transition-fast)',
        normal: 'var(--transition-normal)',
        slow: 'var(--transition-slow)',
      },
      transitionTimingFunction: {
        smooth: 'ease-in-out',
      },

      /* === Z-INDEX === */
      zIndex: {
        hide: 'var(--z-hide)',
        auto: 'var(--z-auto)',
        base: 'var(--z-base)',
        dropdown: 'var(--z-dropdown)',
        sticky: 'var(--z-sticky)',
        fixed: 'var(--z-fixed)',
        'modal-backdrop': 'var(--z-modal-backdrop)',
        modal: 'var(--z-modal)',
        popover: 'var(--z-popover)',
        tooltip: 'var(--z-tooltip)',
      },

      /* === KEYFRAMES === */
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideDownAndFade: {
          '0%': { opacity: '0', transform: 'translateY(-2px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
  ],
} satisfies Config;
