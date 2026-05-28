import { createFileRoute } from "@tanstack/react-router";
import { CompanyDashboardPage } from "./-company-dashboard.page";

export const Route = createFileRoute("/company/dashboard")({
  component: CompanyDashboardPage,
});
