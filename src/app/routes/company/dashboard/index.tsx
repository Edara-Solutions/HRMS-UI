import { createFileRoute } from "@tanstack/react-router";
import { WorkspaceHomePage } from "@/pages/refusal";

export const Route = createFileRoute("/company/dashboard/")({
  component: WorkspaceHomePage,
});
