import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { AdminAuditPage } from "@/app/admin-audit.page";

const auditOutcomes = ["success", "failure"] as const;

const adminAuditSearchSchema = z.object({
  q: z
    .preprocess(
      (value) => (typeof value === "string" && value.trim() ? value.trim() : undefined),
      z.string().max(120).optional(),
    )
    .catch(undefined),
  outcome: z.enum(auditOutcomes).optional().catch(undefined),
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().min(1).max(100).catch(10),
});

export const Route = createFileRoute("/admin/audit/")({
  validateSearch: adminAuditSearchSchema.parse,
  component: AdminAuditPage,
});
