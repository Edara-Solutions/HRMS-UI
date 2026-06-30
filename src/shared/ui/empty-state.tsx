import type { LucideIcon } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

interface EmptyStateProps extends HTMLAttributes<HTMLDivElement> {
  /** Muted icon that hints at what's missing (e.g. Inbox, CalendarClock). */
  icon: LucideIcon;
  /** Primary line — keep it short and concrete. */
  title: string;
  /** Secondary explanation of the current state. */
  description?: string;
  /** Optional action slot (a Button or Link). */
  action?: ReactNode;
}

/**
 * Calm, token-first empty state for lists and panels.
 *
 * Use when a list/table/aside has no items: a muted icon, one concrete line,
 * an optional explanation, and an optional action. No illustration art — the
 * system's "calm" north star favors restraint over decoration.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 px-6 py-10 text-center",
        className,
      )}
      {...props}
    >
      <Icon
        size={22}
        strokeWidth={1.6}
        className="text-[var(--color-text-faint)]"
        aria-hidden="true"
      />
      <p className="text-sm font-medium text-[var(--color-text-muted)]">{title}</p>
      {description && (
        <p className="max-w-[40ch] text-xs leading-relaxed text-[var(--color-text-faint)]">
          {description}
        </p>
      )}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
