import { Badge } from "@/shared/ui/badge";
import { Card, CardContent } from "@/shared/ui/card";
import { Sparkline } from "@/shared/ui/sparkline";
import type { KpiData } from "./fixtures";

interface KpiCardProps {
  data: KpiData;
}

const trendBadgeVariant: Record<KpiData["trend"]["direction"], "success" | "danger" | "default"> = {
  up: "success",
  down: "danger",
  flat: "default",
};

const sparklineColor: Record<KpiData["trend"]["direction"], "primary" | "warning" | "danger"> = {
  up: "primary",
  down: "danger",
  flat: "warning",
};

export function KpiCard({ data }: KpiCardProps) {
  return (
    <Card className="transition-[shadow,border-color] duration-[var(--motion-base)] hover:border-[color-mix(in_srgb,var(--color-primary)_25%,var(--color-border))] hover:shadow-[var(--shadow-md)]">
      <CardContent className="flex flex-col gap-2.5 p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-[var(--color-text-muted)]">{data.label}</span>
          <Badge variant={trendBadgeVariant[data.trend.direction]}>{data.trend.label}</Badge>
        </div>
        <div className="flex items-end justify-between gap-3">
          <div className="flex items-baseline gap-1">
            <span className="text-[28px] font-bold tracking-tight text-[var(--color-text)] tabular-nums">
              {data.value}
            </span>
            {data.unit && (
              <span className="text-base font-medium text-[var(--color-text-muted)]">
                {data.unit}
              </span>
            )}
          </div>
          <Sparkline data={data.sparkline} color={sparklineColor[data.trend.direction]} />
        </div>
        <p className="text-xs text-[var(--color-text-muted)]">{data.footer}</p>
      </CardContent>
    </Card>
  );
}
