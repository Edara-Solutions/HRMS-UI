import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import type { EventItem } from "./fixtures";

interface EventListProps {
  items: EventItem[];
}

export function EventList({ items }: EventListProps) {
  return (
    <Card>
      <CardHeader className="border-b border-[var(--color-border)] pb-3">
        <div>
          <CardTitle className="text-[13.5px]">Upcoming events</CardTitle>
          <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">This week</p>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y divide-[var(--color-border)]">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-2.5 px-4 py-2.5 transition-colors hover:bg-[var(--color-surface-2)]"
            >
              <div className="flex size-10 shrink-0 flex-col items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-2)]">
                <span className="text-[9px] font-semibold uppercase leading-none text-[var(--color-text-faint)]">
                  {item.month}
                </span>
                <span className="text-[15px] font-bold leading-tight tabular-nums text-[var(--color-text)]">
                  {item.day}
                </span>
              </div>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-[var(--color-text)]">
                  {item.name}
                </p>
                <p className="truncate text-[11px] text-[var(--color-text-muted)]">
                  {item.description}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
