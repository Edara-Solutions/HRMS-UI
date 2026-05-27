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
  primary: "bg-[var(--color-primary-soft)] text-[var(--color-primary)] border border-transparent",
  success: "bg-emerald-50 text-[var(--color-success)] border border-transparent",
  warning: "bg-amber-50 text-[var(--color-warning)] border border-transparent",
  danger: "bg-rose-50 text-[var(--color-danger)] border border-transparent",
  info: "bg-sky-50 text-[var(--color-info)] border border-transparent",
  warn: "bg-amber-50 text-[var(--color-warning)] border border-amber-100",
  teal: "bg-[var(--color-primary-soft)] text-[var(--color-primary)] border border-transparent",
  risk: "bg-rose-50 text-[var(--color-danger)] border border-rose-100",
  done: "bg-emerald-50 text-[var(--color-success)] border border-emerald-100",
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
