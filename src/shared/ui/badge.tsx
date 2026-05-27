import { cn } from "@/shared/lib/cn";
import type { HTMLAttributes } from "react";

type BadgeVariant = "default" | "primary" | "success" | "warning" | "danger" | "info";

const variantClassName: Record<BadgeVariant, string> = {
  default: "bg-[var(--color-surface-2)] text-[var(--color-text-muted)]",
  primary: "bg-[var(--color-primary-soft)] text-[var(--color-primary)]",
  success: "bg-emerald-50 text-[var(--color-success)]",
  warning: "bg-amber-50 text-[var(--color-warning)]",
  danger: "bg-rose-50 text-[var(--color-danger)]",
  info: "bg-sky-50 text-[var(--color-info)]",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[var(--radius-full)] px-2.5 py-0.5 text-xs font-medium",
        variantClassName[variant],
        className,
      )}
      {...props}
    />
  );
}
