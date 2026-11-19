import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { PlatformLeadDetailPage } from "@/pages/platform/lead-detail";
export const Route = createFileRoute("/platform/leads/$publicId")({
  validateSearch: z.object({ activityPage: z.coerce.number().int().min(1).catch(1) }).parse,
  component: LeadRoute,
});
function LeadRoute() {
  const { publicId } = Route.useParams();
  return (
    <PlatformLeadDetailPage
      key={publicId}
      publicId={publicId}
      activityPage={Route.useSearch().activityPage}
    />
  );
}
