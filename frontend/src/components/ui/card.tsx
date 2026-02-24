// src/components/ui/card.tsx
// Implements: architecture/ui-ux-best-practices
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
