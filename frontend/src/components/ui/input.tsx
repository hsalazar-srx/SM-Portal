// src/components/ui/input.tsx
// Implements: architecture/ui-ux-best-practices
import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * The ids that tie a field to its label and its message, so screen readers announce "Search" for the field and read
 * the error or hint with it, and clicking the label focuses the field. A caller's own `id` wins.
 */
function useFieldId(id: string | undefined, error: string | undefined, helperText: string | undefined) {
  const generatedId = React.useId();
  const fieldId = id ?? generatedId;
  const messageId = `${fieldId}-message`;
  const hasMessage = Boolean(error || helperText);
  return {
    fieldId,
    messageId,
    describedBy: hasMessage ? messageId : undefined,
    invalid: error ? true : undefined,
  };
}

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, type = "text", id, ...props }, ref) => {
    const { fieldId, messageId, describedBy, invalid } = useFieldId(id, error, helperText);
    return (
      <div className="space-y-sm">
        {label && (
          <label htmlFor={fieldId} className="block text-sm font-medium text-text">
            {label}
          </label>
        )}
        <input
          id={fieldId}
          type={type}
          className={cn(
            "flex h-12 w-full rounded-md border border-outline bg-bg px-md py-sm",
            "text-body font-normal",
            "placeholder:text-text-muted",
            "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:border-transparent",
            "transition-all duration-normal",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "text-base md:text-sm", // Prevent zoom on iOS
            error && "border-error focus:ring-error",
            className
          )}
          ref={ref}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          {...props}
        />
        {helperText && !error && (
          <p id={messageId} className="text-xs text-text-weak">{helperText}</p>
        )}
        {error && (
          <p id={messageId} className="text-xs text-error font-medium">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const { fieldId, messageId, describedBy, invalid } = useFieldId(id, error, helperText);
    return (
      <div className="space-y-sm">
        {label && (
          <label htmlFor={fieldId} className="block text-sm font-medium text-text">
            {label}
          </label>
        )}
        <textarea
          id={fieldId}
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
          aria-invalid={invalid}
          aria-describedby={describedBy}
          {...props}
        />
        {helperText && !error && (
          <p id={messageId} className="text-xs text-text-weak">{helperText}</p>
        )}
        {error && (
          <p id={messageId} className="text-xs text-error font-medium">{error}</p>
        )}
      </div>
    );
  }
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
  ({ className, label, error, helperText, options, id, ...props }, ref) => {
    const { fieldId, messageId, describedBy, invalid } = useFieldId(id, error, helperText);
    return (
      <div className="space-y-sm">
        {label && (
          <label htmlFor={fieldId} className="block text-sm font-medium text-text">
            {label}
          </label>
        )}
        <select
          id={fieldId}
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
          aria-invalid={invalid}
          aria-describedby={describedBy}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {helperText && !error && (
          <p id={messageId} className="text-xs text-text-weak">{helperText}</p>
        )}
        {error && (
          <p id={messageId} className="text-xs text-error font-medium">{error}</p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";
