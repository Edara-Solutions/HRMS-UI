import { requireAuthenticated } from "@/auth/guards";
import { AppShell } from "@/shared/layout/app-shell";
import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin")({
  beforeLoad: () => requireAuthenticated({ platformAdminOnly: true }),
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <AppShell portal="admin">
      <Outlet />
    </AppShell>
  );
}
