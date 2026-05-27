import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/dashboard")({
  component: AdminDashboardPage,
});

function AdminDashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-[var(--color-text)]">Admin Dashboard</h1>
      <p className="mt-2 text-sm text-[var(--color-text-muted)]">Platform overview coming soon.</p>
    </div>
  );
}
