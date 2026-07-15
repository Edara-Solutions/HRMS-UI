import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/companies/$publicId")({
  component: CompanyDetailLayout,
});

function CompanyDetailLayout() {
  return <Outlet />;
}
