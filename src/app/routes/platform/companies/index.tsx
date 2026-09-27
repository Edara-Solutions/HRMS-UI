import { createFileRoute } from "@tanstack/react-router";
import { PlatformCompaniesPage, pageSearchSchema } from "@/pages/platform/companies";
export const Route = createFileRoute("/platform/companies/")({
  validateSearch: pageSearchSchema.parse,
  component: CompaniesRoute,
});
function CompaniesRoute() {
  return <PlatformCompaniesPage search={Route.useSearch()} />;
}
