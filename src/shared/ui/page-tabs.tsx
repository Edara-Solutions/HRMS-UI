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
  id?: string;
  className?: string;
}

export function PageTabs<TValue extends string>({
  items,
  value,
  onValueChange,
  ariaLabel,
  id,
  className,
}: PageTabsProps<TValue>) {
  return (
    <div className={cn("mb-6  border-b border-[var(--color-border)]", className)}>
      <div
        className="scrollbar-calm flex gap-1 overflow-x-auto"
        role="tablist"
        aria-label={ariaLabel}
        onKeyDown={(event) => {
          if (!(event.target instanceof HTMLButtonElement)) return;
          const tabs = Array.from(
            event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"),
          );
          const index = tabs.indexOf(event.target);
          if (index < 0) return;
          const direction = getComputedStyle(event.currentTarget).direction === "rtl" ? -1 : 1;
          let next: number;
          switch (event.key) {
            case "Home":
              next = 0;
              break;
            case "End":
              next = tabs.length - 1;
              break;
            case "ArrowLeft":
              next = (index - direction + tabs.length) % tabs.length;
              break;
            case "ArrowRight":
              next = (index + direction + tabs.length) % tabs.length;
              break;
            default:
              return;
          }
          event.preventDefault();
          tabs[next]?.focus();
          tabs[next]?.click();
        }}
      >
        {items.map((item) => (
          <button
            key={item.value}
            type="button"
            role="tab"
            id={id ? `${id}-tab-${item.value}` : undefined}
            aria-controls={id ? `${id}-panel-${item.value}` : undefined}
            aria-selected={value === item.value}
            tabIndex={value === item.value ? 0 : -1}
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
