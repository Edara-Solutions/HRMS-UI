import { createFileRoute } from "@tanstack/react-router";
import { PlatformCompanyDetailPage } from "@/pages/platform/company-detail";
export const Route = createFileRoute("/platform/companies/$publicId")({ component: CompanyRoute });
function CompanyRoute() {
  const { publicId } = Route.useParams();
  return <PlatformCompanyDetailPage key={publicId} publicId={publicId} />;
}
