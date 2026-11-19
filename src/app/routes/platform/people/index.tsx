import { createFileRoute } from "@tanstack/react-router";
import { PlatformPeoplePage, rosterSearchSchema } from "@/pages/platform/people";

export const Route = createFileRoute("/platform/people/")({
  validateSearch: rosterSearchSchema.parse,
  component: PlatformPeopleRoute,
});

function PlatformPeopleRoute() {
  return <PlatformPeoplePage search={Route.useSearch()} />;
}
