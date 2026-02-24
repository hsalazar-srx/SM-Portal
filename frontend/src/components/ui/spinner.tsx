// src/components/ui/spinner.tsx
// Implements: architecture/ui-ux-best-practices
import * as React from "react";
import { cn } from "@/lib/utils";

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "accent" | "subtle";
}

export function Spinner({ className, size = "md", variant = "primary", ...props }: SpinnerProps) {
  const sizeStyles = {
    sm: "w-4 h-4 border-2",
    md: "w-8 h-8 border-3",
    lg: "w-12 h-12 border-4",
  };

  const variantStyles = {
    primary: "border-primary border-t-transparent",
    accent: "border-info border-t-transparent",
    subtle: "border-neutral-300 border-t-neutral-600",
  };

  return (
    <div
      className={cn(
        "inline-block rounded-full animate-spin",
        sizeStyles[size],
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
}

export interface LoadingStateProps extends React.HTMLAttributes<HTMLDivElement> {
  isLoading: boolean;
  size?: SpinnerProps["size"];
  message?: string;
}

export function LoadingState({ className, isLoading, size = "md", message = "Loading...", ...props }: LoadingStateProps) {
  if (!isLoading) return null;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-md py-lg",
        className
      )}
      {...props}
    >
      <Spinner size={size} />
      {message && (
        <p className="text-sm text-text-weak">{message}</p>
      )}
    </div>
  );
}

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  count?: number;
  circle?: boolean;
}

export function Skeleton({ className, count = 1, circle = false, ...props }: SkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "bg-neutral-200 animate-pulse",
            circle ? "rounded-full w-10 h-10" : "rounded-md h-4 w-full",
            i < count - 1 && "mb-md",
            className
          )}
          {...props}
        />
      ))}
    </>
  );
}
