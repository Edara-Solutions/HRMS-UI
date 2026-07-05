import { History } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import type { AdminActivity } from "./fixtures";

interface AdminActivityFeedProps {
  items: AdminActivity[];
}

const dotColorMap = {
  primary: "bg-[var(--color-primary)]",
  warning: "bg-[var(--color-warning)]",
  success: "bg-[var(--color-success)]",
  default: "bg-[var(--color-border)]",
};

export function AdminActivityFeed({ items }: AdminActivityFeedProps) {
  return (
    <Card>
      <CardHeader className="border-b border-[var(--color-border)] pb-3">
        <div>
          <CardTitle>Platform activity</CardTitle>
          <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">Recent system events</p>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {items.length === 0 ? (
          <EmptyState
            className="py-8"
            icon={History}
            title="No recent activity"
            description="Platform events will show up here as they happen."
          />
        ) : (
          <ul className="relative px-4 py-3">
            {items.map((item, index) => (
              <li key={item.id} className="relative flex gap-0 pb-3.5 last:pb-0">
                {/* Connecting line */}
                {index < items.length - 1 && (
                  <div className="absolute start-[27px] top-[16px] bottom-[-6px] w-px bg-[var(--color-border)] opacity-70" />
                )}
                {/* Dot */}
                <div
                  className={cn(
                    "z-10 mt-1.5 size-2 shrink-0 rounded-full",
                    dotColorMap[item.dotColor],
                  )}
                />
                {/* Content */}
                <div className="flex-1 ps-2">
                  <p className="text-[12.5px] font-medium leading-snug text-[var(--color-text)]">
                    {item.text}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[var(--color-text-faint)]">
                    {item.module} · {item.time}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
