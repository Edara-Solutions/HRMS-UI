import { createFileRoute } from "@tanstack/react-router";
import { CompanyRolePage } from "@/pages/company/role";

export const Route = createFileRoute("/company/roles/$publicId")({
  component: CompanyRoleRoute,
});

function CompanyRoleRoute() {
  const { publicId } = Route.useParams();
  return <CompanyRolePage key={publicId} publicId={publicId} />;
}
