// src/components/ui/drawer.tsx
// Implements: architecture/ui-ux-best-practices
// Mobile-friendly drawer/sidebar component
import * as React from "react";
import { cn } from "@/lib/utils";

export interface DrawerProps extends React.HTMLAttributes<HTMLDivElement> {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  side?: "left" | "right";
}

export const Drawer = React.forwardRef<HTMLDivElement, DrawerProps>(
  ({ className, isOpen, onOpenChange, side = "left", children, ...props }, ref) => {
    React.useEffect(() => {
      if (isOpen) {
        document.body.style.overflow = "hidden";
      } else {
        document.body.style.overflow = "unset";
      }
      return () => {
        document.body.style.overflow = "unset";
      };
    }, [isOpen]);

    return (
      <>
        {/* Backdrop */}
        {isOpen && (
          <div
            className="fixed inset-0 z-modal-backdrop bg-black/50 transition-opacity duration-normal"
            onClick={() => onOpenChange(false)}
            aria-hidden="true"
          />
        )}

        {/* Drawer */}
        <div
          ref={ref}
          className={cn(
            "fixed top-0 z-modal h-screen w-64 bg-bg shadow-lg transition-transform duration-normal",
            side === "left" ? "left-0" : "right-0",
            isOpen
              ? side === "left"
                ? "translate-x-0"
                : "translate-x-0"
              : side === "left"
              ? "-translate-x-full"
              : "translate-x-full",
            className
          )}
          {...props}
        >
          {children}
        </div>
      </>
    );
  }
);

Drawer.displayName = "Drawer";

export interface DrawerContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export const DrawerContent = React.forwardRef<HTMLDivElement, DrawerContentProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("h-full overflow-y-auto", className)} {...props} />
  )
);

DrawerContent.displayName = "DrawerContent";

export interface DrawerHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

export const DrawerHeader = React.forwardRef<HTMLDivElement, DrawerHeaderProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("border-b border-outline p-md space-y-sm", className)}
      {...props}
    />
  )
);

DrawerHeader.displayName = "DrawerHeader";

export interface DrawerBodyProps extends React.HTMLAttributes<HTMLDivElement> {}

export const DrawerBody = React.forwardRef<HTMLDivElement, DrawerBodyProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-md space-y-sm", className)} {...props} />
  )
);

DrawerBody.displayName = "DrawerBody";

export interface DrawerFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

export const DrawerFooter = React.forwardRef<HTMLDivElement, DrawerFooterProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("border-t border-outline p-md space-y-sm mt-auto", className)}
      {...props}
    />
  )
);

DrawerFooter.displayName = "DrawerFooter";
