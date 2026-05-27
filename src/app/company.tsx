import { requireAuthenticated } from "@/auth/guards";
import { AppShell } from "@/shared/layout/app-shell";
import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/company")({
  beforeLoad: () => requireAuthenticated(),
  component: CompanyLayout,
});

function CompanyLayout() {
  return (
    <AppShell portal="company">
      <Outlet />
    </AppShell>
  );
}
