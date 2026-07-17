import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { requireAuthenticated } from "@/app/guards/auth-guards";
import { AdminEmailDeliveriesPage } from "@/pages/admin/email-deliveries";

const DELIVERY_STATUSES = [
  "QUEUED",
  "PROCESSING",
  "RETRY_SCHEDULED",
  "SENT",
  "FAILED",
  "CANCELLED",
] as const;
const EMAIL_CONTEXTS = ["EDARA", "COMPANY"] as const;

const ADMIN_EMAIL_DELIVERIES_SEARCH_SCHEMA = z.object({
  companyPublicId: z.string().uuid().optional().catch(undefined),
  context: z.enum(EMAIL_CONTEXTS).optional().catch(undefined),
  emailTypeKey: z.string().max(120).optional().catch(undefined),
  recipientEmail: z.string().email().optional().catch(undefined),
  status: z.enum(DELIVERY_STATUSES).optional().catch(undefined),
  createdFrom: z.string().datetime().optional().catch(undefined),
  createdTo: z.string().datetime().optional().catch(undefined),
  deliveryId: z.string().uuid().optional().catch(undefined),
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().min(1).max(10).catch(10),
});

/** Platform Admin delivery operations with URL-owned filters and pagination. */
export const Route = createFileRoute("/admin/email/deliveries")({
  beforeLoad: () => requireAuthenticated({ platformAdminOnly: true }),
  validateSearch: ADMIN_EMAIL_DELIVERIES_SEARCH_SCHEMA.parse,
  component: AdminEmailDeliveriesPage,
});
