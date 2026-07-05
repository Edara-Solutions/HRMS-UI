import { createFileRoute, Outlet } from "@tanstack/react-router";
import { requireAdminConsoleEnabled, requireAuthenticated } from "@/app/guards/auth-guards";
import { AppShell } from "@/widgets/app-shell";

export const Route = createFileRoute("/admin")({
  beforeLoad: () => {
    requireAdminConsoleEnabled();
    return requireAuthenticated({ platformAdminOnly: true });
  },
  component: AdminPortalShell,
});

function AdminPortalShell() {
  return (
    <AppShell portal="admin">
      <Outlet />
    </AppShell>
  );
}
