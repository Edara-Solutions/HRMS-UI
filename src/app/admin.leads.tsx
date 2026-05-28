import type { LeadStatus } from "@/admin/leads/api";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { AdminLeadsPage } from "./admin-leads.page";

const leadStatuses = [
  "NEW",
  "NO_ANSWER",
  "WRONG_NUMBER",
  "CONTACTED",
  "FOLLOWING_UP",
  "QUALIFIED",
  "NOT_QUALIFIED",
  "NOT_INTERESTED",
  "DEMO_SCHEDULED",
  "WAITING_QUOTATION",
  "QUOTATION_SENT",
  "TRIAL_STARTED",
  "NEGOTIATION",
  "WON_CONVERTED",
  "LOST",
  "REJOINED",
] as const satisfies readonly LeadStatus[];

const adminLeadsSearchSchema = z.object({
  q: z
    .preprocess(
      (value) => (typeof value === "string" && value.trim() ? value.trim() : undefined),
      z.string().max(120).optional(),
    )
    .catch(undefined),
  status: z.enum(leadStatuses).optional().catch(undefined),
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().min(1).max(100).catch(10),
});

export const Route = createFileRoute("/admin/leads")({
  validateSearch: adminLeadsSearchSchema.parse,
  component: AdminLeadsPage,
});
