import { ChevronDown } from "lucide-react";
import type { SelectHTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        className={cn(
          "h-[34px] w-full appearance-none rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] ps-3 pe-8 text-[13px] text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        size={14}
        className="pointer-events-none absolute end-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
        aria-hidden="true"
      />
    </div>
  );
}
