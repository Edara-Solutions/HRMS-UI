import { createFileRoute } from "@tanstack/react-router";
import {
  accessRequestsSearchSchema,
  PlatformAccessRequestsPage,
} from "@/pages/platform/access-requests";

export const Route = createFileRoute("/platform/access-requests/")({
  validateSearch: accessRequestsSearchSchema.parse,
  component: AccessRequestsRoute,
});

function AccessRequestsRoute() {
  return <PlatformAccessRequestsPage search={Route.useSearch()} />;
}
