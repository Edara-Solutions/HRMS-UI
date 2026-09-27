import { createFileRoute } from "@tanstack/react-router";
import { AccessSessionPage, workspaceSearchSchema } from "@/pages/platform/access-session";

export const Route = createFileRoute("/platform/access-sessions/$sessionPublicId")({
  validateSearch: workspaceSearchSchema.parse,
  component: AccessSessionRoute,
});

function AccessSessionRoute() {
  const { sessionPublicId } = Route.useParams();
  return (
    <AccessSessionPage
      key={sessionPublicId}
      sessionPublicId={sessionPublicId}
      search={Route.useSearch()}
    />
  );
}
