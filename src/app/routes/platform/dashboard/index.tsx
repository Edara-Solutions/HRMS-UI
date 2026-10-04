import { createFileRoute } from "@tanstack/react-router";
import { PlatformDashboardPage } from "@/pages/platform/overview";
import { WorkspaceHomePage } from "@/pages/refusal";

export const Route = createFileRoute("/platform/dashboard/")({
  component: () => (
    <WorkspaceHomePage>
      <PlatformDashboardPage />
    </WorkspaceHomePage>
  ),
});
