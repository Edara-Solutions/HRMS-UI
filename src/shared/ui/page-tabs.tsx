import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

export interface PageTabItem<TValue extends string> {
  value: TValue;
  label: ReactNode;
  disabled?: boolean;
}

interface PageTabsProps<TValue extends string> {
  items: Array<PageTabItem<TValue>>;
  value: TValue;
  onValueChange: (value: TValue) => void;
  ariaLabel: string;
  className?: string;
}

export function PageTabs<TValue extends string>({
  items,
  value,
  onValueChange,
  ariaLabel,
  className,
}: PageTabsProps<TValue>) {
  return (
    <div className={cn("mb-6  border-b border-[var(--color-border)]", className)}>
      <div
        className="scrollbar-calm flex gap-1 overflow-x-auto"
        role="tablist"
        aria-label={ariaLabel}
      >
        {items.map((item) => (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={value === item.value}
            disabled={item.disabled}
            className={cn(
              "shrink-0 cursor-pointer border-b-2 px-3 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60",
              value === item.value
                ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]",
            )}
            onClick={() => onValueChange(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
