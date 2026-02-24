// src/components/ui/alert.tsx
// Implements: architecture/ui-ux-best-practices
import { cn } from "@/lib/utils";

type Kind = "info" | "success" | "warning" | "danger";

const map = {
  info:    { border: "var(--color-info)",    bg: "rgba(47,111,163,.12)",  fg: "var(--color-text)" },
  success: { border: "var(--color-success)", bg: "rgba(31,138,91,.12)",   fg: "var(--color-text)" },
  warning: { border: "var(--color-warning)", bg: "rgba(201,138,0,.12)",   fg: "var(--color-text)" },
  danger:  { border: "var(--color-danger)",  bg: "rgba(199,61,61,.12)",   fg: "var(--color-text)" },
};

export function Alert({
  kind = "info",
  title,
  children,
  className,
}: {
  kind?: Kind;
  title?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const k = map[kind];
  return (
    <div
      className={cn(
        "rounded-md border p-4",
        className
      )}
      style={{
        borderColor: k.border,
        background: k.bg,
        color: k.fg,
      }}
      role="status"
    >
      {title && <div className="font-semibold mb-1">{title}</div>}
      <div className="text-text-weak">{children}</div>
    </div>
  );
}
