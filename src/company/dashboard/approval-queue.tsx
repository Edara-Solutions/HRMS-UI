import { Avatar } from "@/shared/ui/avatar";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import type { ApprovalItem } from "./fixtures";

interface ApprovalQueueProps {
  items: ApprovalItem[];
  totalCount: number;
}

export function ApprovalQueue({ items, totalCount }: ApprovalQueueProps) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between border-b border-[var(--color-border)] pb-3">
        <div>
          <CardTitle className="text-[13.5px]">Approvals queue</CardTitle>
          <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
            {totalCount} items pending review
          </p>
        </div>
        <Badge variant="warning">{totalCount}</Badge>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y divide-[var(--color-border)]">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-2.5 px-4 py-2.5 transition-colors hover:bg-[var(--color-surface-2)]"
            >
              <Avatar size="sm" initials={item.initials} alt={item.name} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-[var(--color-text)]">
                  {item.name}
                </p>
                <p className="truncate text-[11px] text-[var(--color-text-muted)]">
                  {item.description}
                </p>
              </div>
              <Button variant="secondary" className="h-6.5 shrink-0 px-2 text-xs">
                {item.action}
              </Button>
            </li>
          ))}
        </ul>
        <div className="border-t border-[var(--color-border)] px-4 py-3">
          <Button variant="secondary" className="h-8 w-full justify-center text-xs">
            View all {totalCount} items
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
