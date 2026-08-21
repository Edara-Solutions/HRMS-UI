import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { AdminAuditCatalogPage } from "@/pages/admin/audit";

// A company lens narrows the catalog to the events a tenant can see and scopes every
// live-occurrence link to that tenant, so it is search state like any other filter.
const catalogSearchSchema = z.object({
  companyPublicId: z.string().uuid().optional().catch(undefined),
});

export const Route = createFileRoute("/admin/audit/catalog")({
  validateSearch: catalogSearchSchema.parse,
  component: AdminAuditCatalogPage,
});
