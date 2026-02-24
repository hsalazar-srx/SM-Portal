// src/components/ui/input.tsx
// Implements: architecture/ui-ux-best-practices
import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, type = "text", ...props }, ref) => (
    <div className="space-y-sm">
      {label && (
        <label className="block text-sm font-medium text-text">
          {label}
        </label>
      )}
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-outline bg-bg px-md py-sm",
          "text-body font-normal",
          "placeholder:text-text-muted",
          "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:border-transparent",
          "transition-all duration-normal",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-error focus:ring-error",
          className
        )}
        ref={ref}
        {...props}
      />
      {helperText && !error && (
        <p className="text-xs text-text-weak">{helperText}</p>
      )}
      {error && (
        <p className="text-xs text-error font-medium">{error}</p>
      )}
    </div>
  )
);

Input.displayName = "Input";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, helperText, ...props }, ref) => (
    <div className="space-y-sm">
      {label && (
        <label className="block text-sm font-medium text-text">
          {label}
        </label>
      )}
      <textarea
        className={cn(
          "flex min-h-24 w-full rounded-md border border-outline bg-bg px-md py-sm",
          "text-body font-normal",
          "placeholder:text-text-muted",
          "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:border-transparent",
          "transition-all duration-normal",
          "disabled:cursor-not-allowed disabled:opacity-50 resize-none",
          error && "border-error focus:ring-error",
          className
        )}
        ref={ref}
        {...props}
      />
      {helperText && !error && (
        <p className="text-xs text-text-weak">{helperText}</p>
      )}
      {error && (
        <p className="text-xs text-error font-medium">{error}</p>
      )}
    </div>
  )
);

Textarea.displayName = "Textarea";

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: { value: string; label: string }[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, helperText, options, ...props }, ref) => (
    <div className="space-y-sm">
      {label && (
        <label className="block text-sm font-medium text-text">
          {label}
        </label>
      )}
      <select
        className={cn(
          "flex h-10 w-full rounded-md border border-outline bg-bg px-md py-sm",
          "text-body font-normal",
          "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:border-transparent",
          "transition-all duration-normal",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "cursor-pointer",
          error && "border-error focus:ring-error",
          className
        )}
        ref={ref}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {helperText && !error && (
        <p className="text-xs text-text-weak">{helperText}</p>
      )}
      {error && (
        <p className="text-xs text-error font-medium">{error}</p>
      )}
    </div>
  )
);

Select.displayName = "Select";
