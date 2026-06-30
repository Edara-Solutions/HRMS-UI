import { Building2 } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import type { RecentSignup } from "./fixtures";

interface RecentSignupsProps {
  items: RecentSignup[];
}

export function RecentSignups({ items }: RecentSignupsProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex-col gap-3 border-b border-[var(--color-border)] pb-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>Recent signups</CardTitle>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            Companies that joined this month
          </p>
        </div>
        <Button intent="utility" className="w-full sm:w-auto">
          View all
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {items.length === 0 ? (
          <EmptyState
            className="py-10"
            icon={Building2}
            title="No new signups this month"
            description="Companies that join will be listed here."
          />
        ) : (
          <>
            <div className="divide-y divide-[var(--color-border)] lg:hidden">
              {items.map((item) => (
                <article key={item.id} className="p-4">
                  <div className="flex flex-col gap-2 min-[520px]:flex-row min-[520px]:items-start min-[520px]:justify-between">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-[var(--color-text)]">
                        {item.company}
                      </h3>
                      <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{item.plan}</p>
                    </div>
                    <Badge variant={item.status.variant}>{item.status.label}</Badge>
                  </div>

                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                    <div>
                      <dt className="text-[var(--color-text-faint)]">Joined</dt>
                      <dd className="mt-0.5 text-[var(--color-text-muted)]">{item.date}</dd>
                    </div>
                    <div>
                      <dt className="text-[var(--color-text-faint)]">Employees</dt>
                      <dd className="mt-0.5 tabular-nums text-[var(--color-text)]">
                        {item.employees}
                      </dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>

            <div className="scrollbar-calm scrollbar-horizontal hidden overflow-x-auto lg:block">
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
          </>
        )}
      </CardContent>
    </Card>
  );
}
