import { createFileRoute } from "@tanstack/react-router";
import { AdminDashboardPage } from "@/app/admin-dashboard.page";

export const Route = createFileRoute("/admin/dashboard/")({
  component: AdminDashboardPage,
});
