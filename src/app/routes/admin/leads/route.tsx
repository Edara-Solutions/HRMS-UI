import { createFileRoute, Outlet } from "@tanstack/react-router";

function AdminLeadsLayout() {
  return <Outlet />;
}

export const Route = createFileRoute("/admin/leads")({
  component: AdminLeadsLayout,
});
