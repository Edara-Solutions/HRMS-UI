import { cn } from "@/shared/lib/cn";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";
type ButtonSize = "sm" | "md" | "lg" | "icon";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  isLoading?: boolean;
}

const variantClassName: Record<ButtonVariant, string> = {
  primary:
    "border border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-on-primary)] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--color-on-primary)_14%,transparent)] hover:border-[var(--color-primary-hover)] hover:bg-[var(--color-primary-hover)]",
  secondary:
    "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:border-[color-mix(in_srgb,var(--color-border)_72%,var(--color-primary))] hover:bg-[var(--color-surface-2)]",
  ghost:
    "border border-transparent text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]",
  destructive:
    "border border-[var(--color-danger)] bg-[var(--color-danger)] text-[var(--color-on-danger)] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--color-on-danger)_14%,transparent)] hover:bg-[color-mix(in_srgb,var(--color-danger)_88%,var(--color-text))]",
};

const sizeClassName: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-9 px-3.5 text-[13px]",
  lg: "h-10 px-4 text-sm",
  icon: "size-9 px-0",
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  leadingIcon,
  trailingIcon,
  isLoading = false,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-[var(--radius-md)] font-medium leading-none transition-[background-color,border-color,color,box-shadow,transform] duration-[var(--motion-fast)] ease-[var(--motion-easing)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] active:translate-y-px disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60",
        sizeClassName[size],
        variantClassName[variant],
        className,
      )}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      {...props}
    >
      {isLoading ? <LoadingIndicator /> : leadingIcon}
      {children}
      {!isLoading && trailingIcon}
    </button>
  );
}

function LoadingIndicator() {
  return (
    <span
      className="size-3.5 shrink-0 animate-spin rounded-full border border-current border-e-transparent"
      aria-hidden="true"
      data-slot="button-loader"
    />
  );
}
