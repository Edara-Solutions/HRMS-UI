import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { AdminAuditPage } from "@/pages/admin/audit";

const adminAuditSearchSchema = z.object({
  cursor: z.string().max(500).optional().catch(undefined),
  limit: z.coerce.number().int().min(1).max(100).catch(50),
  companyPublicId: z.string().uuid().optional().catch(undefined),
  scope: z.enum(["PLATFORM", "COMPANY"]).optional().catch(undefined),
});

export const Route = createFileRoute("/admin/audit/")({
  validateSearch: adminAuditSearchSchema.parse,
  component: AdminAuditPage,
});
