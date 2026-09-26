import { z } from "zod";
import type { SubscriptionStatus } from "../api/subscriptions";

const subscriptionStatuses = [
  "TRIAL",
  "ACTIVE",
  "FROZEN",
  "CANCELLED",
  "EXPIRED",
] as const satisfies readonly SubscriptionStatus[];

export const pageSearchSchema = z.object({
  q: z
    .preprocess(
      (value) => (typeof value === "string" && value.trim() ? value.trim() : undefined),
      z.string().max(120).optional(),
    )
    .catch(undefined),
  status: z.enum(subscriptionStatuses).optional().catch(undefined),
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().min(1).max(100).catch(10),
});
