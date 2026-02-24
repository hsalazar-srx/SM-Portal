// src/components/ui/typography.tsx
// Implements: architecture/ui-ux-best-practices
import * as React from "react";
import { cn } from "@/lib/utils";

export const H1 = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>((props, ref) => (
  <h1
    ref={ref}
    {...props}
    className={cn(
      "text-[var(--fs-h1)] font-bold leading-[var(--lh-heading)] text-text",
      props.className
    )}
  />
));
H1.displayName = "H1";

export const H2 = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>((props, ref) => (
  <h2
    ref={ref}
    {...props}
    className={cn(
      "text-[var(--fs-h2)] font-semibold leading-[var(--lh-heading)] text-text",
      props.className
    )}
  />
));
H2.displayName = "H2";

export const H3 = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>((props, ref) => (
  <h3
    ref={ref}
    {...props}
    className={cn(
      "text-[var(--fs-h3)] font-semibold leading-[var(--lh-heading)] text-text",
      props.className
    )}
  />
));
H3.displayName = "H3";

export const Display = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>((props, ref) => (
  <h1
    ref={ref}
    {...props}
    className={cn(
      "text-[var(--fs-display)] font-bold leading-[var(--lh-heading)] text-text",
      props.className
    )}
  />
));
Display.displayName = "Display";

export const Body = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>((props, ref) => (
  <p
    ref={ref}
    {...props}
    className={cn(
      "text-[var(--fs-body)] leading-[var(--lh-body)] text-text",
      props.className
    )}
  />
));
Body.displayName = "Body";

export const BodySmall = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>((props, ref) => (
  <p
    ref={ref}
    {...props}
    className={cn(
      "text-[var(--fs-body-sm)] leading-[var(--lh-body)] text-text",
      props.className
    )}
  />
));
BodySmall.displayName = "BodySmall";

export const Caption = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>((props, ref) => (
  <p
    ref={ref}
    {...props}
    className={cn(
      "text-[var(--fs-caption)] leading-[var(--lh-body)] text-text-weak",
      props.className
    )}
  />
));
Caption.displayName = "Caption";

export const Muted = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>((props, ref) => (
  <p
    ref={ref}
    {...props}
    className={cn(
      "text-[var(--fs-body-sm)] leading-[var(--lh-body)] text-text-weak",
      props.className
    )}
  />
));
Muted.displayName = "Muted";

export const Code = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement>
>((props, ref) => (
  <code
    ref={ref}
    {...props}
    className={cn(
      "font-mono bg-surface px-2 py-1 rounded text-[var(--fs-body-sm)]",
      props.className
    )}
  />
));
Code.displayName = "Code";

export const Link = React.forwardRef<
  HTMLAnchorElement,
  React.AnchorHTMLAttributes<HTMLAnchorElement>
>((props, ref) => (
  <a
    ref={ref}
    {...props}
    className={cn(
      "text-primary hover:underline focus-visible:focus-ring",
      props.className
    )}
  />
));
Link.displayName = "Link";
