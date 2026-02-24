// src/components/ui/stats.tsx
// Implements: architecture/ui-ux-best-practices
import * as React from "react";
import { cn } from "@/lib/utils";

export interface StatsCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    direction: "up" | "down";
    value: string;
  };
  color?: "primary" | "success" | "warning" | "error" | "info";
}

export function StatsCard({
  className,
  label,
  value,
  icon,
  trend,
  color = "primary",
  ...props
}: StatsCardProps) {
  const colorStyles = {
    primary: "bg-primary-50 border-primary-200 text-primary-700",
    success: "bg-success/10 border-success/30 text-success",
    warning: "bg-warning/10 border-warning/30 text-warning",
    error: "bg-error/10 border-error/30 text-error",
    info: "bg-info/10 border-info/30 text-info",
  };

  const trendStyles = {
    up: "text-success flex items-center gap-xs",
    down: "text-error flex items-center gap-xs",
  };

  return (
    <div
      className={cn(
        "rounded-lg border p-md space-y-md transition-all duration-normal hover:shadow-md",
        colorStyles[color],
        className
      )}
      {...props}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium uppercase tracking-wider opacity-75">{label}</p>
          <p className="text-2xl font-bold mt-sm">{value}</p>
        </div>
        {icon && (
          <div className="text-2xl flex-shrink-0">
            {icon}
          </div>
        )}
      </div>
      {trend && (
        <div className={trendStyles[trend.direction]}>
          <span className="text-md">{trend.direction === "up" ? "↗" : "↘"}</span>
          <span className="text-xs font-medium">{trend.value}</span>
        </div>
      )}
    </div>
  );
}

export interface StatsGridProps extends React.HTMLAttributes<HTMLDivElement> {
  stats: StatsCardProps[];
  columns?: 1 | 2 | 3 | 4;
}

export function StatsGrid({
  className,
  stats,
  columns = 3,
  ...props
}: StatsGridProps) {
  const colStyles = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
  };

  return (
    <div
      className={cn("grid gap-md", colStyles[columns], className)}
      {...props}
    >
      {stats.map((stat, i) => (
        <StatsCard key={i} {...stat} />
      ))}
    </div>
  );
}
