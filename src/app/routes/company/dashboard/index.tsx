import { createFileRoute } from "@tanstack/react-router";
import { CompanyDashboardPage } from "@/pages/company/dashboard";
import { WorkspaceHomePage } from "@/pages/refusal";

export const Route = createFileRoute("/company/dashboard/")({
  component: () => (
    <WorkspaceHomePage>
      <CompanyDashboardPage />
    </WorkspaceHomePage>
  ),
});
