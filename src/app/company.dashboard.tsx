import { useCurrentSession } from "@/auth/guards";
import { LocaleSwitcher } from "@/shared/components/locale-switcher";
import { Button } from "@/shared/ui/button";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/company/dashboard")({
  component: CompanyDashboardPage,
});

function CompanyDashboardPage() {
  const session = useCurrentSession();
  const user = session?.user;

  return (
    <section className="mx-auto max-w-6xl px-6 py-10">
      <p className="text-sm font-medium text-[var(--color-primary)]">Company Portal</p>
      <h1 className="mt-3 text-3xl font-semibold">Dashboard placeholder</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-text-muted)]">
        Dummy authenticated user from `company-portal-api.md`: {user?.firstName} {user?.lastName},
        employee code {user?.employeeCode}, company {user?.companyCode}.
      </p>
      <div className="mt-6">
        <LocaleSwitcher />
      </div>
      <div className="mt-8 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <h2 className="text-lg font-semibold">Next module slice</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
          People, roles, sessions, settings, and audit remain deferred until the module scaffold
          phase.
        </p>
        <Button className="mt-4" variant="secondary">
          Placeholder action
        </Button>
      </div>
    </section>
  );
}
