import { cn } from "@/shared/lib/cn";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive" | "subtle" | "link";

/**
 * Size hierarchy — pick based on where the button lives.
 *
 *   xs    24px / 11px   Compact inline utilities
 *   sm    32px / 12px   Table actions, filter chips, card footer actions
 *   md    36px / 13px   Standard page-header and form actions
 *   lg    40px / 14px   Prominent form CTAs
 *   icon / iconSm / iconLg  Square icon-only at matching tiers
 *   block Full-width md — replaces className="w-full"
 */
type ButtonSize = "xs" | "sm" | "md" | "lg" | "icon" | "iconSm" | "iconLg" | "block";

/**
 * intent maps a semantic role to a default variant + size.
 * Explicit variant/size props always override the intent defaults.
 *
 *   cta                 → primary    md
 *   action              → secondary  md
 *   utility             → ghost      sm   (View all, Edit, Manage)
 *   dismissive          → ghost      md   (Cancel, Close)
 *   destructive         → destructive md  (after confirmation only)
 *   destructive-trigger → ghost      md   (opens the confirmation)
 *   navigation          → ghost      md   (Back, Next)
 *   toggle              → ghost      iconSm
 */
type ButtonIntent =
  | "cta"
  | "action"
  | "utility"
  | "dismissive"
  | "destructive"
  | "destructive-trigger"
  | "navigation"
  | "toggle";

const intentDefaults: Record<ButtonIntent, { variant: ButtonVariant; size: ButtonSize }> = {
  cta: { variant: "primary", size: "md" },
  action: { variant: "secondary", size: "md" },
  utility: { variant: "ghost", size: "sm" },
  dismissive: { variant: "ghost", size: "md" },
  destructive: { variant: "destructive", size: "md" },
  "destructive-trigger": { variant: "ghost", size: "md" },
  navigation: { variant: "ghost", size: "md" },
  toggle: { variant: "ghost", size: "iconSm" },
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  intent?: ButtonIntent;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  isLoading?: boolean;
  /** True when no visible text label — pair with aria-label */
  iconOnly?: boolean;
  /** Controlled pressed state for toggle (sets aria-pressed + pressed styling) */
  pressed?: boolean;
}

const variantClassName: Record<ButtonVariant, string> = {
  // Resting fill uses --color-primary-fill (lighter than brand in light mode).
  // Hover reverts to full --color-primary — "press into brand" effect.
  primary:
    "border border-[var(--color-primary-fill)] bg-[var(--color-primary-fill)] font-semibold text-[var(--color-on-primary)] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--color-on-primary)_12%,transparent)] hover:border-[var(--color-primary-fill-hover)] hover:bg-[var(--color-primary-fill-hover)]",

  secondary:
    "border border-[color-mix(in_srgb,var(--color-border)_85%,var(--color-text-faint))] bg-[var(--color-surface)] font-semibold text-[var(--color-text)] hover:border-[color-mix(in_srgb,var(--color-border)_45%,var(--color-primary))] hover:bg-[color-mix(in_srgb,var(--color-surface-2)_55%,var(--color-border))] hover:shadow-[var(--shadow-sm)]",

  // Ghost gains a border + background on hover so the hover is clearly visible.
  ghost:
    "border border-transparent font-medium text-[var(--color-text-muted)] hover:border-[var(--color-border)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]",

  destructive:
    "border border-[var(--color-danger)] bg-[var(--color-danger)] font-semibold text-[var(--color-on-danger)] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--color-on-danger)_12%,transparent)] hover:bg-[color-mix(in_srgb,var(--color-danger)_88%,var(--color-text))]",

  subtle:
    "border border-transparent bg-[var(--color-surface-2)] font-medium text-[var(--color-text)] hover:bg-[color-mix(in_srgb,var(--color-surface-2)_80%,var(--color-border))]",

  link: "border border-transparent bg-transparent px-0 font-medium text-[var(--color-primary)] underline-offset-4 hover:underline",
};

const sizeClassName: Record<ButtonSize, string> = {
  xs: "h-6 px-2 text-[11px]",
  sm: "h-8 px-3 text-xs",
  md: "h-9 px-3.5 text-[13px]",
  lg: "h-10 px-4 text-sm",
  icon: "size-9 px-0",
  iconSm: "size-[34px] px-0",
  iconLg: "size-10 px-0",
  block: "h-9 w-full justify-center px-3.5 text-[13px]",
};

const destructiveTriggerClassName =
  "text-[var(--color-danger)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)] hover:border-[color-mix(in_srgb,var(--color-danger)_30%,transparent)]";

const pressedClassName =
  "bg-[var(--color-primary-soft)] text-[var(--color-primary)] border-[color-mix(in_srgb,var(--color-primary)_20%,transparent)] hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary)]";

export function Button({
  className,
  variant: variantProp,
  size: sizeProp,
  intent,
  leadingIcon,
  trailingIcon,
  isLoading = false,
  iconOnly,
  pressed,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const defaults = intent ? intentDefaults[intent] : undefined;
  const variant = variantProp ?? defaults?.variant ?? "primary";
  const size = sizeProp ?? defaults?.size ?? "md";

  const isDestructiveTrigger = intent === "destructive-trigger";
  const isToggle = intent === "toggle" || pressed !== undefined;

  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-[var(--radius-md)] leading-none transition-[background-color,border-color,color,box-shadow,transform] duration-[var(--motion-fast)] ease-[var(--motion-easing)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] active:translate-y-px disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60",
        sizeClassName[size],
        variantClassName[variant],
        isDestructiveTrigger && destructiveTriggerClassName,
        isToggle && pressed && pressedClassName,
        className,
      )}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      aria-pressed={isToggle ? pressed : undefined}
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
