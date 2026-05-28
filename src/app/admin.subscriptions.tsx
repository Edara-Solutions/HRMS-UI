import type { SubscriptionStatus } from "@/admin/companies/api";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { AdminSubscriptionsPage } from "./admin-subscriptions.page";

const subscriptionStatuses = [
  "TRIAL",
  "ACTIVE",
  "FROZEN",
  "CANCELLED",
  "EXPIRED",
] as const satisfies readonly SubscriptionStatus[];

const adminSubscriptionsSearchSchema = z.object({
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

export const Route = createFileRoute("/admin/subscriptions")({
  validateSearch: adminSubscriptionsSearchSchema.parse,
  component: AdminSubscriptionsPage,
});
