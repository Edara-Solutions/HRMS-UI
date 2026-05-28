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
    <Card>
      <CardHeader className="flex-row items-start justify-between border-b border-[var(--color-border)] pb-3">
        <div>
          <CardTitle>People spotlight</CardTitle>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            Employees with upcoming actions or open items
          </p>
        </div>
        <Button variant="secondary" className="h-7.5 px-2.5 text-xs">
          View all
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="scrollbar-calm scrollbar-horizontal overflow-x-auto">
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
