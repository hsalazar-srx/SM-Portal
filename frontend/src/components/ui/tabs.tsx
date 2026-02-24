// src/components/ui/tabs.tsx
// Implements: architecture/ui-ux-best-practices
import * as React from "react";
import { cn } from "@/lib/utils";

export interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
}

export const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  ({ className, defaultValue, value, onValueChange, children, ...props }, ref) => {
    const [internalValue, setInternalValue] = React.useState(defaultValue || "");
    const controlledValue = value !== undefined ? value : internalValue;

    const handleValueChange = (newValue: string) => {
      setInternalValue(newValue);
      onValueChange?.(newValue);
    };

    return (
      <div ref={ref} className={className} {...props}>
        <TabsContext.Provider value={{ value: controlledValue, onValueChange: handleValueChange }}>
          {children}
        </TabsContext.Provider>
      </div>
    );
  }
);

Tabs.displayName = "Tabs";

interface TabsContextType {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextType | undefined>(undefined);

const useTabsContext = () => {
  const context = React.useContext(TabsContext);
  if (!context) {
    throw new Error("useTabsContext must be used within Tabs");
  }
  return context;
};

export interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {}

export const TabsList = React.forwardRef<HTMLDivElement, TabsListProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-md bg-neutral-100 p-1 gap-sm border border-outline",
        className
      )}
      {...props}
    />
  )
);

TabsList.displayName = "TabsList";

export interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

export const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ className, value, ...props }, ref) => {
    const { value: tabValue, onValueChange } = useTabsContext();
    const isActive = tabValue === value;

    return (
      <button
        ref={ref}
        onClick={() => onValueChange(value)}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-md py-sm text-sm font-medium",
          "transition-all duration-normal",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500",
          "disabled:pointer-events-none disabled:opacity-50",
          isActive
            ? "bg-white text-primary shadow-sm border border-primary-200"
            : "text-text-weak hover:text-text hover:bg-white/50",
          className
        )}
        {...props}
      />
    );
  }
);

TabsTrigger.displayName = "TabsTrigger";

export interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

export const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ className, value, ...props }, ref) => {
    const { value: tabValue } = useTabsContext();

    if (tabValue !== value) {
      return null;
    }

    return (
      <div
        ref={ref}
        className={cn("mt-md space-y-md", className)}
        {...props}
      />
    );
  }
);

TabsContent.displayName = "TabsContent";
