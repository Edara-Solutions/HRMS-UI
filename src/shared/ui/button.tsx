import { cn } from "@/shared/lib/cn";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  leadingIcon?: ReactNode;
}

const variantClassName: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--color-primary)] border border-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] hover:border-[var(--color-primary-hover)]",
  secondary:
    "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface-2)]",
  ghost:
    "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]",
  destructive: "bg-[var(--color-danger)] border border-[var(--color-danger)] text-white",
};

export function Button({
  className,
  variant = "primary",
  leadingIcon,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-[var(--radius-md)] px-3.5 text-[13px] font-medium transition-colors duration-[var(--motion-fast)] disabled:cursor-not-allowed disabled:opacity-60",
        variantClassName[variant],
        className,
      )}
      {...props}
    >
      {leadingIcon}
      {children}
    </button>
  );
}
