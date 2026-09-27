import { createFileRoute } from "@tanstack/react-router";
import { PlatformPersonPage } from "@/pages/platform/person";

export const Route = createFileRoute("/platform/people/$publicId")({
  component: PlatformPersonRoute,
});

function PlatformPersonRoute() {
  const { publicId } = Route.useParams();
  return <PlatformPersonPage key={publicId} publicId={publicId} />;
}
