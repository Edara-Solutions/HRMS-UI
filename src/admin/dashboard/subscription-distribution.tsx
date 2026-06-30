import { Layers } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { ProgressBar } from "@/shared/ui/progress-bar";
import type { SubscriptionDistribution as SubscriptionData } from "./fixtures";

interface SubscriptionDistributionProps {
  items: SubscriptionData[];
  totalCount: number;
}

export function SubscriptionDistribution({ items, totalCount }: SubscriptionDistributionProps) {
  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] pb-3">
        <div>
          <CardTitle>Subscription mix</CardTitle>
          <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">By plan tier</p>
        </div>
        <Badge>{totalCount} total</Badge>
      </CardHeader>
      <CardContent className="p-4">
        {items.length === 0 ? (
          <EmptyState
            className="py-6"
            icon={Layers}
            title="No subscriptions yet"
            description="The plan-tier breakdown will appear here once companies subscribe."
          />
        ) : (
          <div className="flex flex-col gap-2.5">
            {items.map((item) => (
              <div key={item.name} className="grid grid-cols-[100px_1fr_40px] items-center gap-2.5">
                <span className="truncate text-xs text-[var(--color-text-muted)]">{item.name}</span>
                <ProgressBar value={item.percentage} color={item.color} />
                <span className="text-end text-xs font-semibold tabular-nums text-[var(--color-text)]">
                  {item.count}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
