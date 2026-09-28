import { createFileRoute } from "@tanstack/react-router";
import { CompanyAuditPage, companyAuditSearchSchema } from "@/pages/company/audit";

export const Route = createFileRoute("/company/audit/")({
  validateSearch: companyAuditSearchSchema.parse,
  component: CompanyAuditPage,
});
