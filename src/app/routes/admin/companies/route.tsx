import { createFileRoute, Outlet } from "@tanstack/react-router";

function AdminCompaniesLayout() {
  return <Outlet />;
}

export const Route = createFileRoute("/admin/companies")({
  component: AdminCompaniesLayout,
});
