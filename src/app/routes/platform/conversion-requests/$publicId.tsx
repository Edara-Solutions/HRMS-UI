import { createFileRoute } from "@tanstack/react-router";
import { PlatformConversionRequestDetailPage } from "@/pages/platform/conversion-requests";
export const Route = createFileRoute("/platform/conversion-requests/$publicId")({
  component: RequestRoute,
});
function RequestRoute() {
  const { publicId } = Route.useParams();
  return <PlatformConversionRequestDetailPage key={publicId} publicId={publicId} />;
}
