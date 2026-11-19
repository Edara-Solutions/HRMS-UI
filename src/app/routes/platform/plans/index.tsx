import { createFileRoute } from "@tanstack/react-router";
import { catalogueSearchSchema, PlatformPlansPage } from "@/pages/platform/plans";
export const Route = createFileRoute("/platform/plans/")({
  validateSearch: catalogueSearchSchema.parse,
  component: PlansRoute,
});
function PlansRoute() {
  return <PlatformPlansPage search={Route.useSearch()} />;
}
