import { z } from "zod";
import { parseDateEdgeSearchValue } from "@/shared/lib/date-edge";

const DELIVERY_STATUSES = [
  "QUEUED",
  "PROCESSING",
  "RETRY_SCHEDULED",
  "SENT",
  "FAILED",
  "CANCELLED",
] as const;
const EMAIL_CONTEXTS = ["EDARA", "COMPANY"] as const;

const dateTimeEdgeSearchSchema = z.preprocess(
  parseDateEdgeSearchValue,
  z
    .object({
      date: z.string().datetime(),
      edgeDateType: z.enum(["inclusive", "exclusive"]),
    })
    .optional(),
);

export const pageSearchSchema = z.object({
  companyPublicId: z.string().uuid().optional().catch(undefined),
  context: z.enum(EMAIL_CONTEXTS).optional().catch(undefined),
  emailTypeKey: z.string().max(120).optional().catch(undefined),
  recipientEmail: z.string().email().optional().catch(undefined),
  status: z.enum(DELIVERY_STATUSES).optional().catch(undefined),
  createdFrom: dateTimeEdgeSearchSchema.catch(undefined),
  createdTo: dateTimeEdgeSearchSchema.catch(undefined),
  deliveryId: z.string().uuid().optional().catch(undefined),
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().min(1).max(10).catch(10),
});

/** Platform User delivery operations with URL-owned filters and pagination. */
