// src/components/ui/badge.tsx
// Implements: architecture/ui-ux-best-practices
import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "primary" | "success" | "warning" | "error" | "info" | "neutral";
  size?: "sm" | "md" | "lg";
  icon?: React.ReactNode;
  onRemove?: () => void;
}

export function Badge({
  className,
  variant = "primary",
  size = "md",
  icon,
  onRemove,
  children,
  ...props
}: BadgeProps) {
  const baseStyles = "inline-flex items-center gap-sm font-medium rounded-full transition-all duration-normal whitespace-nowrap";

  const variantStyles = {
    primary: "bg-primary-100 text-primary-700 border border-primary-200",
    success: "bg-success/10 text-success border border-success/30",
    warning: "bg-warning/10 text-warning border border-warning/30",
    error: "bg-error/10 text-error border border-error/30",
    info: "bg-info/10 text-info border border-info/30",
    neutral: "bg-neutral-100 text-neutral-600 border border-neutral-200",
  };

  const sizeStyles = {
    sm: "px-sm py-xs text-xs",
    md: "px-md py-sm text-sm",
    lg: "px-lg py-md text-base",
  };

  return (
    <div
      className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
      {...props}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span>{children}</span>
      {onRemove && (
        <button
          onClick={onRemove}
          className="ml-sm flex-shrink-0 hover:opacity-70 transition-opacity"
          aria-label="Remove badge"
        >
          ✕
        </button>
      )}
    </div>
  );
}

export interface BadgeGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  items: { id: string; label: string; icon?: React.ReactNode; variant?: BadgeProps["variant"] }[];
  onRemove?: (id: string) => void;
  limit?: number;
}

export function BadgeGroup({
  className,
  items,
  onRemove,
  limit,
  ...props
}: BadgeGroupProps) {
  const displayItems = limit ? items.slice(0, limit) : items;
  const remaining = limit && items.length > limit ? items.length - limit : 0;

  return (
    <div className={cn("flex flex-wrap gap-sm", className)} {...props}>
      {displayItems.map((item) => (
        <Badge
          key={item.id}
          variant={item.variant}
          icon={item.icon}
          onRemove={onRemove ? () => onRemove(item.id) : undefined}
        >
          {item.label}
        </Badge>
      ))}
      {remaining > 0 && (
        <Badge variant="neutral">+{remaining} more</Badge>
      )}
    </div>
  );
}
