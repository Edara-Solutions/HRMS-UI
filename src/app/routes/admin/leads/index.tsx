import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import type { LeadSource, LeadStatus } from "@/pages/admin/leads";
import { AdminLeadsPage } from "@/pages/admin/leads";

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

const leadSources = [
  "CRM",
  "LANDING_PAGE",
  "FACEBOOK",
  "GOOGLE",
  "LINKEDIN",
  "REFERRAL",
  "PARTNER",
  "OTHER",
] as const satisfies readonly LeadSource[];

const adminLeadsSearchSchema = z.object({
  q: z
    .preprocess(
      (value) => (typeof value === "string" && value.trim() ? value.trim() : undefined),
      z.string().max(120).optional(),
    )
    .catch(undefined),
  status: z.enum(leadStatuses).optional().catch(undefined),
  source: z.enum(leadSources).optional().catch(undefined),
  country: z
    .preprocess(
      (value) => (typeof value === "string" && value.trim() ? value.trim() : undefined),
      z.string().max(120).optional(),
    )
    .catch(undefined),
  createdFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .catch(undefined),
  createdTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .catch(undefined),
  isArchived: z
    .preprocess(
      (value) => (value === "true" ? true : value === "false" ? false : value),
      z.boolean().default(false),
    )
    .catch(false),
  sort: z.enum(["createdAtAsc", "createdAtDesc"]).optional().catch(undefined),
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().min(1).max(100).catch(10),
});

export const Route = createFileRoute("/admin/leads/")({
  validateSearch: adminLeadsSearchSchema.parse,
  component: AdminLeadsPage,
});
