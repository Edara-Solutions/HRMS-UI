import { createFileRoute } from "@tanstack/react-router";
import { CompanyDashboardPage } from "@/pages/company/dashboard";

export const Route = createFileRoute("/company/dashboard/")({
  component: CompanyDashboardPage,
});
