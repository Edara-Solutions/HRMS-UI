import type { ReactNode } from "react";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent } from "@/shared/ui/card";

interface KpiCardProps {
  label: string;
  value: ReactNode;
  footer: string;
  trend?: { label: string; rising: boolean };
}

export function KpiCard({ label, value, footer, trend }: KpiCardProps) {
  return (
    <Card as="section" aria-label={label}>
      <CardContent className="flex flex-col gap-2.5 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="min-w-0 truncate text-xs font-medium text-[var(--color-text-muted)]">
            {label}
          </span>
          {trend && (
            <Badge
              variant={trend.rising ? "success" : "default"}
              className="shrink-0 whitespace-nowrap"
            >
              {trend.label}
            </Badge>
          )}
        </div>
        <span className="text-[28px] font-bold leading-none tracking-tight text-[var(--color-text)] tabular-nums">
          {value}
        </span>
        <p className="text-xs text-[var(--color-text-muted)]">{footer}</p>
      </CardContent>
    </Card>
  );
}
