import { requireAuthenticated } from "@/auth/guards";
import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin")({
  beforeLoad: () => requireAuthenticated({ platformAdminOnly: true }),
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <section className="min-h-dvh bg-[var(--color-bg)]">
      <Outlet />
    </section>
  );
}
