// src/components/ui/button.tsx
// Implements: architecture/ui-ux-best-practices
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
          "border border-[var(--scn-primary)] text-[var(--scn-primary)] hover:bg-[color-mix(in_oklab,white,var(--scn-primary)_8%)] rounded-[var(--radius-lg)]",
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
