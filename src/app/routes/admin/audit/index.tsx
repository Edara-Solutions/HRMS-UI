import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { AdminAuditPage, platformAuditEventTypes } from "@/pages/admin/audit";

const platformEventTypes = new Set(platformAuditEventTypes);

// A filtered trail has to be shareable and back-button-safe, so every filter is search state.
// The event types are narrowed to the ones this contract admits: a link carrying anything
// else would be answered with a 400 rather than a page.
const adminAuditSearchSchema = z.object({
  cursor: z.string().max(500).optional().catch(undefined),
  limit: z.coerce.number().int().min(1).max(100).catch(50),
  companyPublicId: z.string().uuid().optional().catch(undefined),
  scope: z.enum(["PLATFORM", "COMPANY"]).optional().catch(undefined),
  occurredFrom: z.string().datetime({ offset: true }).optional().catch(undefined),
  occurredTo: z.string().datetime({ offset: true }).optional().catch(undefined),
  actorPublicId: z.string().uuid().optional().catch(undefined),
  outcome: z.enum(["SUCCESS", "FAILURE"]).optional().catch(undefined),
  eventType: z
    .array(z.string())
    .transform((eventTypes) => eventTypes.filter((eventType) => platformEventTypes.has(eventType)))
    .optional()
    .catch(undefined),
});

export const Route = createFileRoute("/admin/audit/")({
  validateSearch: adminAuditSearchSchema.parse,
  component: AdminAuditPage,
});
