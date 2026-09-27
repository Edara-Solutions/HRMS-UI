import { createFileRoute } from "@tanstack/react-router";
import { CompanyProfilePage } from "@/pages/company/profile";

export const Route = createFileRoute("/company/profile/")({
  component: CompanyProfilePage,
});
