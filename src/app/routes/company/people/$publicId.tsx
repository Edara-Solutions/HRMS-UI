import { createFileRoute } from "@tanstack/react-router";
import { CompanyPersonPage } from "@/pages/company/person";

export const Route = createFileRoute("/company/people/$publicId")({
  component: CompanyPersonRoute,
});

function CompanyPersonRoute() {
  const { publicId } = Route.useParams();
  return <CompanyPersonPage key={publicId} publicId={publicId} />;
}
