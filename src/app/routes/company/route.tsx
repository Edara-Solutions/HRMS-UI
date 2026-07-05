import { createFileRoute, Outlet } from "@tanstack/react-router";
import { requireAuthenticated } from "@/app/guards/auth-guards";
import { AppShell } from "@/widgets/app-shell";

export const Route = createFileRoute("/company")({
  beforeLoad: () => requireAuthenticated(),
  component: CompanyPortalShell,
});

function CompanyPortalShell() {
  return (
    <AppShell portal="company">
      <Outlet />
    </AppShell>
  );
}
