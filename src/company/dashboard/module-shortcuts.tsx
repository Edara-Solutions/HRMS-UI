import { Link } from "@tanstack/react-router";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

interface ModuleShortcut {
  type: string;
  name: string;
  description: string;
  badge: { label: string; variant: "default" | "warning" | "primary" | "success" };
  href: string;
}

const shortcuts: ModuleShortcut[] = [
  {
    type: "Directory",
    name: "People",
    description: "Browse employees, teams, and profiles.",
    badge: { label: "248", variant: "default" },
    href: "/company/people",
  },
  {
    type: "Queue",
    name: "Approvals",
    description: "Time off, payroll, and document requests.",
    badge: { label: "11", variant: "warning" },
    href: "/company/approvals",
  },
  {
    type: "Cycle · Q2",
    name: "Performance",
    description: "Goals, reviews, and manager notes.",
    badge: { label: "Active", variant: "primary" },
    href: "/company/performance",
  },
  {
    type: "Finance · May",
    name: "Payroll",
    description: "Verify totals, exceptions, readiness.",
    badge: { label: "Closes in 3d", variant: "warning" },
    href: "/company/payroll",
  },
];

export function ModuleShortcuts() {
  return (
    <Card>
      <CardHeader className="border-b border-[var(--color-border)] pb-3">
        <div>
          <CardTitle>Module shortcuts</CardTitle>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            Quick access to top-level areas
          </p>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-3.5">
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {shortcuts.map((shortcut) => (
            <Link
              key={shortcut.name}
              to={shortcut.href}
              className="group flex flex-col gap-1.5 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 transition-[border-color,box-shadow,transform] duration-[var(--motion-fast)] hover:border-[var(--color-primary)] hover:shadow-[var(--shadow-sm)] active:scale-[0.99]"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--color-text-faint)]">
                  {shortcut.type}
                </span>
                <Badge variant={shortcut.badge.variant}>{shortcut.badge.label}</Badge>
              </div>
              <p className="text-sm font-semibold text-[var(--color-text)]">{shortcut.name}</p>
              <p className="text-xs leading-relaxed text-[var(--color-text-muted)]">
                {shortcut.description}
              </p>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
