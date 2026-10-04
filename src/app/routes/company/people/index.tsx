import { createFileRoute } from "@tanstack/react-router";
import { CompanyPeoplePage, rosterSearchSchema } from "@/pages/company/people";

export const Route = createFileRoute("/company/people/")({
  validateSearch: rosterSearchSchema.parse,
  component: CompanyPeopleRoute,
});

function CompanyPeopleRoute() {
  return <CompanyPeoplePage search={Route.useSearch()} />;
}
