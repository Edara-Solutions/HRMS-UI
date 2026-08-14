import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { CompanyAuditPage } from "@/pages/company/audit";

// The Company route scopes itself to the authenticated identity, so paging is the whole
// search contract — a Company or scope filter has nowhere to be expressed.
const companyAuditSearchSchema = z.object({
  cursor: z.string().max(500).optional().catch(undefined),
  limit: z.coerce.number().int().min(1).max(100).catch(50),
});

export const Route = createFileRoute("/company/audit/")({
  validateSearch: companyAuditSearchSchema.parse,
  component: CompanyAuditPage,
});
