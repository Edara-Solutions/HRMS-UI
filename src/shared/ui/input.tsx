import type { InputHTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-[34px] w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[13px] text-[var(--color-text)] outline-none transition-colors placeholder:text-[var(--color-text-faint)] focus-visible:outline-none focus-visible:border-[color-mix(in_srgb,var(--color-primary)_50%,var(--color-border))] focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--color-primary)_20%,transparent)]",
        className,
      )}
      {...props}
    />
  );
}
