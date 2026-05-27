import { requireAuthenticated } from "@/auth/guards";
import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/company")({
  beforeLoad: () => requireAuthenticated(),
  component: CompanyLayout,
});

function CompanyLayout() {
  return (
    <section className="min-h-dvh bg-[var(--color-bg)]">
      <Outlet />
    </section>
  );
}
