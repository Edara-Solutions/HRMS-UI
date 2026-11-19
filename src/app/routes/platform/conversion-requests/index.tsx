import { createFileRoute } from "@tanstack/react-router";
import {
  PlatformConversionRequestsPage,
  pageSearchSchema,
} from "@/pages/platform/conversion-requests";
export const Route = createFileRoute("/platform/conversion-requests/")({
  validateSearch: pageSearchSchema.parse,
  component: RequestsRoute,
});
function RequestsRoute() {
  return <PlatformConversionRequestsPage search={Route.useSearch()} />;
}
