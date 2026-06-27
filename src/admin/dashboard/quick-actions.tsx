import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

interface QuickAction {
  name: string;
  description: string;
  href: string;
}

const quickActions: QuickAction[] = [
  {
    name: "Add company",
    description: "Register a new company on the platform.",
    href: "/admin/companies/new",
  },
  {
    name: "Manage plans",
    description: "Update pricing, features, and limits.",
    href: "/admin/plans",
  },
  {
    name: "View reports",
    description: "Platform analytics and insights.",
    href: "/admin/reports",
  },
  {
    name: "System settings",
    description: "Global configuration and maintenance.",
    href: "/admin/settings",
  },
];

export function QuickActions() {
  return (
    <Card>
      <CardHeader className="border-b border-[var(--color-border)] pb-3">
        <div>
          <CardTitle className="text-[13.5px]">Quick actions</CardTitle>
          <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">Common admin tasks</p>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-3.5">
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {quickActions.map((action) => (
            <Link
              key={action.name}
              to={action.href}
              className="group flex flex-col gap-1 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 transition-all duration-[var(--motion-fast)] hover:border-[var(--color-primary)] hover:shadow-[var(--shadow-sm)]"
            >
              <p className="text-sm font-semibold text-[var(--color-text)]">{action.name}</p>
              <p className="text-xs leading-relaxed text-[var(--color-text-muted)]">
                {action.description}
              </p>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
