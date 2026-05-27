import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { ProgressBar } from "@/shared/ui/progress-bar";
import type { DepartmentData } from "./fixtures";

interface DepartmentMixProps {
  departments: DepartmentData[];
  totalCount: number;
}

export function DepartmentMix({ departments, totalCount }: DepartmentMixProps) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between border-b border-[var(--color-border)] pb-3">
        <div>
          <CardTitle className="text-[13.5px]">Department mix</CardTitle>
          <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">Headcount by team</p>
        </div>
        <Badge>{totalCount} total</Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-2.5 p-4">
        {departments.map((dept) => (
          <div key={dept.name} className="grid grid-cols-[90px_1fr_32px] items-center gap-2.5">
            <span className="truncate text-xs text-[var(--color-text-muted)]">{dept.name}</span>
            <ProgressBar value={dept.percentage} color={dept.color} />
            <span className="text-end text-xs font-semibold tabular-nums text-[var(--color-text)]">
              {dept.count}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
