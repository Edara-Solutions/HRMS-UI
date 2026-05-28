import { cn } from "@/shared/lib/cn";
import type { HTMLAttributes } from "react";

type BadgeVariant =
  | "default"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "warn"
  | "teal"
  | "risk"
  | "done";

const variantClassName: Record<BadgeVariant, string> = {
  default:
    "bg-[var(--color-surface-2)] text-[var(--color-text-muted)] border border-[var(--color-border)]",
  primary:
    "bg-[var(--color-primary-soft)] text-[var(--color-primary)] border border-[color-mix(in_srgb,var(--color-primary)_22%,transparent)]",
  success: "bg-[var(--color-success-soft)] text-[var(--color-success)] border border-transparent",
  warning: "bg-[var(--color-warning-soft)] text-[var(--color-warning)] border border-transparent",
  danger: "bg-[var(--color-danger-soft)] text-[var(--color-danger)] border border-transparent",
  info: "bg-[var(--color-info-soft)] text-[var(--color-info)] border border-transparent",
  warn: "bg-[var(--color-warning-soft)] text-[var(--color-warning)] border border-[color-mix(in_srgb,var(--color-warning)_22%,transparent)]",
  teal: "bg-[var(--color-primary-soft)] text-[var(--color-primary)] border border-[color-mix(in_srgb,var(--color-primary)_22%,transparent)]",
  risk: "bg-[var(--color-danger-soft)] text-[var(--color-danger)] border border-[color-mix(in_srgb,var(--color-danger)_22%,transparent)]",
  done: "bg-[var(--color-success-soft)] text-[var(--color-success)] border border-[color-mix(in_srgb,var(--color-success)_22%,transparent)]",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-[var(--radius-sm)] px-1.5 text-[11px] font-semibold",
        variantClassName[variant],
        className,
      )}
      {...props}
    />
  );
}
