import { z } from "zod";
import { auditPageSize } from "@/features/audit-filters";
import { isCompanyEventType } from "../api/audit";

// The Company route scopes itself to the authenticated identity, so it carries the shared
// filter set without a Company or scope filter — every row it can see is COMPANY-scope.
export const pageSearchSchema = z.object({
  cursor: z.string().max(500).optional().catch(undefined),
  limit: z.coerce.number().int().min(1).max(100).catch(auditPageSize),
  occurredFrom: z.string().datetime({ offset: true }).optional().catch(undefined),
  occurredTo: z.string().datetime({ offset: true }).optional().catch(undefined),
  actorPublicId: z.string().uuid().optional().catch(undefined),
  outcome: z.enum(["SUCCESS", "FAILURE"]).optional().catch(undefined),
  eventType: z
    .array(z.string())
    .transform((eventTypes): string[] => eventTypes.filter(isCompanyEventType))
    .optional()
    .catch(undefined),
});
