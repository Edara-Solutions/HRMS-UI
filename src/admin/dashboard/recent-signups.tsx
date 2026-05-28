import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import type { RecentSignup } from "./fixtures";

interface RecentSignupsProps {
  items: RecentSignup[];
}

export function RecentSignups({ items }: RecentSignupsProps) {
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between border-b border-[var(--color-border)] pb-3">
        <div>
          <CardTitle>Recent signups</CardTitle>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            Companies that joined this month
          </p>
        </div>
        <Button variant="secondary" className="h-7.5 px-2.5 text-xs">
          View all
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="scrollbar-calm scrollbar-horizontal overflow-x-auto">
          <table className="w-full min-w-[560px]">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="px-3.5 py-2.5 text-start text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                  Company
                </th>
                <th className="px-3.5 py-2.5 text-start text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                  Plan
                </th>
                <th className="px-3.5 py-2.5 text-start text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                  Joined
                </th>
                <th className="px-3.5 py-2.5 text-start text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                  Status
                </th>
                <th className="px-3.5 py-2.5 text-end text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                  Employees
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-[var(--color-border)] transition-colors last:border-b-0 hover:bg-[var(--color-surface-2)]"
                >
                  <td className="px-3.5 py-2.5 text-[13.5px] font-medium text-[var(--color-text)]">
                    {item.company}
                  </td>
                  <td className="px-3.5 py-2.5 text-[13.5px] text-[var(--color-text-muted)]">
                    {item.plan}
                  </td>
                  <td className="px-3.5 py-2.5 text-[13.5px] text-[var(--color-text-muted)]">
                    {item.date}
                  </td>
                  <td className="px-3.5 py-2.5">
                    <Badge variant={item.status.variant}>{item.status.label}</Badge>
                  </td>
                  <td className="px-3.5 py-2.5 text-end text-[13.5px] tabular-nums text-[var(--color-text)]">
                    {item.employees}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
