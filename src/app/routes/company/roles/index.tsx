import { createFileRoute } from "@tanstack/react-router";
import { CompanyRolesPage } from "@/pages/company/roles";

export const Route = createFileRoute("/company/roles/")({
  component: CompanyRolesPage,
});
