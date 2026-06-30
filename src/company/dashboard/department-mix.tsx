import { Layers } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { ProgressBar } from "@/shared/ui/progress-bar";
import type { DepartmentData } from "./fixtures";

interface DepartmentMixProps {
  departments: DepartmentData[];
  totalCount: number;
}

export function DepartmentMix({ departments, totalCount }: DepartmentMixProps) {
  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] pb-3">
        <div>
          <CardTitle>Department mix</CardTitle>
          <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">Headcount by team</p>
        </div>
        <Badge>{totalCount} total</Badge>
      </CardHeader>
      <CardContent className="p-4">
        {departments.length === 0 ? (
          <EmptyState
            className="py-6"
            icon={Layers}
            title="No departments yet"
            description="Headcount by team will appear here once teams are set up."
          />
        ) : (
          <div className="flex flex-col gap-2.5">
            {departments.map((dept) => (
              <div key={dept.name} className="grid grid-cols-[90px_1fr_32px] items-center gap-2.5">
                <span className="truncate text-xs text-[var(--color-text-muted)]">{dept.name}</span>
                <ProgressBar value={dept.percentage} color={dept.color} />
                <span className="text-end text-xs font-semibold tabular-nums text-[var(--color-text)]">
                  {dept.count}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
