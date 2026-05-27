import { cn } from "@/shared/lib/cn";
import type { InputHTMLAttributes } from "react";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "min-h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text)] shadow-none outline-none transition-colors placeholder:text-[var(--color-text-faint)] focus:border-[var(--color-primary)]",
        className,
      )}
      {...props}
    />
  );
}
