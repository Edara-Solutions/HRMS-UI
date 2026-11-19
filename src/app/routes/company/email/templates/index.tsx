import { createFileRoute } from "@tanstack/react-router";
import { CompanyEmailTemplatesPage } from "@/pages/company/email-templates";

export const Route = createFileRoute("/company/email/templates/")({
  component: CompanyEmailTemplatesPage,
});
