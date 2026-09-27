import { createFileRoute } from "@tanstack/react-router";
import { PlatformRolePage } from "@/pages/platform/roles";

export const Route = createFileRoute("/platform/roles/$publicId")({
  component: PlatformRoleRoute,
});

function PlatformRoleRoute() {
  const { publicId } = Route.useParams();
  return <PlatformRolePage key={publicId} publicId={publicId} />;
}
