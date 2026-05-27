import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { ProgressBar } from "@/shared/ui/progress-bar";
import type { SubscriptionDistribution as SubscriptionData } from "./fixtures";

interface SubscriptionDistributionProps {
  items: SubscriptionData[];
  totalCount: number;
}

export function SubscriptionDistribution({ items, totalCount }: SubscriptionDistributionProps) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between border-b border-[var(--color-border)] pb-3">
        <div>
          <CardTitle className="text-[13.5px]">Subscription mix</CardTitle>
          <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">By plan tier</p>
        </div>
        <Badge>{totalCount} total</Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-2.5 p-4">
        {items.map((item) => (
          <div key={item.name} className="grid grid-cols-[100px_1fr_40px] items-center gap-2.5">
            <span className="truncate text-xs text-[var(--color-text-muted)]">{item.name}</span>
            <ProgressBar value={item.percentage} color={item.color} />
            <span className="text-right text-xs font-semibold tabular-nums text-[var(--color-text)]">
              {item.count}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
