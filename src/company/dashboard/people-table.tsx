import { Avatar } from "@/shared/ui/avatar";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import type { PeopleSpotlightItem } from "./fixtures";

interface PeopleTableProps {
  items: PeopleSpotlightItem[];
}

export function PeopleTable({ items }: PeopleTableProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex-col gap-3 border-b border-[var(--color-border)] pb-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>People spotlight</CardTitle>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            Employees with upcoming actions or open items
          </p>
        </div>
        <Button intent="utility" className="w-full sm:w-auto">
          View all
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-[var(--color-border)] lg:hidden">
          {items.map((item) => (
            <article key={item.id} className="p-4">
              <div className="flex items-start gap-3">
                <Avatar size="sm" initials={item.initials} alt={item.name} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-2 min-[520px]:flex-row min-[520px]:items-start min-[520px]:justify-between">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-[var(--color-text)]">
                        {item.name}
                      </h3>
                      <p className="truncate text-xs text-[var(--color-text-muted)]">{item.role}</p>
                    </div>
                    <Badge variant={item.status.variant}>{item.status.label}</Badge>
                  </div>

                  <dl className="mt-3 grid grid-cols-1 gap-x-4 gap-y-2 text-xs min-[520px]:grid-cols-2">
                    <div>
                      <dt className="text-[var(--color-text-faint)]">Department</dt>
                      <dd className="mt-0.5 text-[var(--color-text)]">{item.department}</dd>
                    </div>
                    <div>
                      <dt className="text-[var(--color-text-faint)]">Time off balance</dt>
                      <dd className="mt-0.5 tabular-nums text-[var(--color-text)]">
                        {item.timeOffBalance}
                      </dd>
                    </div>
                    <div className="min-[520px]:col-span-2">
                      <dt className="text-[var(--color-text-faint)]">Next action</dt>
                      <dd className="mt-0.5 text-[var(--color-text-muted)]">{item.nextAction}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="scrollbar-calm scrollbar-horizontal hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="px-3.5 py-2.5 text-start text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                  Employee
                </th>
                <th className="px-3.5 py-2.5 text-start text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                  Department
                </th>
                <th className="px-3.5 py-2.5 text-start text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                  Status
                </th>
                <th className="px-3.5 py-2.5 text-start text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                  Next action
                </th>
                <th className="px-3.5 py-2.5 text-end text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                  Time off balance
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-[var(--color-border)] transition-colors last:border-b-0 hover:bg-[var(--color-surface-2)]"
                >
                  <td className="px-3.5 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <Avatar size="sm" initials={item.initials} alt={item.name} />
                      <div>
                        <p className="text-[13.5px] font-medium text-[var(--color-text)]">
                          {item.name}
                        </p>
                        <p className="text-xs text-[var(--color-text-muted)]">{item.role}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3.5 py-2.5 text-[13.5px] text-[var(--color-text)]">
                    {item.department}
                  </td>
                  <td className="px-3.5 py-2.5">
                    <Badge variant={item.status.variant}>{item.status.label}</Badge>
                  </td>
                  <td className="max-w-[220px] truncate px-3.5 py-2.5 text-[12.5px] text-[var(--color-text-muted)]">
                    {item.nextAction}
                  </td>
                  <td className="px-3.5 py-2.5 text-end text-[13.5px] tabular-nums text-[var(--color-text)]">
                    {item.timeOffBalance}
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
