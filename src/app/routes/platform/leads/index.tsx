import { createFileRoute } from "@tanstack/react-router";
import { PlatformLeadsPage, pageSearchSchema } from "@/pages/platform/leads";
export const Route = createFileRoute("/platform/leads/")({
  validateSearch: pageSearchSchema.parse,
  component: LeadsRoute,
});
function LeadsRoute() {
  return <PlatformLeadsPage search={Route.useSearch()} />;
}
