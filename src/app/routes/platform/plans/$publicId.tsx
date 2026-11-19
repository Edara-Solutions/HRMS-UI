import { createFileRoute } from "@tanstack/react-router";
import { marketSearchSchema, PlatformPlanDetailPage } from "@/pages/platform/plans";
export const Route = createFileRoute("/platform/plans/$publicId")({
  validateSearch: marketSearchSchema.parse,
  component: PlanRoute,
});
function PlanRoute() {
  const { publicId } = Route.useParams();
  return <PlatformPlanDetailPage key={publicId} publicId={publicId} search={Route.useSearch()} />;
}
