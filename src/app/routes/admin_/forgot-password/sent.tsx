import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { requireAdminConsoleEnabled } from "@/app/guards/auth-guards";
import { AdminResetLinkSentPage } from "@/pages/admin/forgot-password";

const searchSchema = z.object({
  email: z.string().email().optional().catch(undefined),
});

export const Route = createFileRoute("/admin_/forgot-password/sent")({
  beforeLoad: () => requireAdminConsoleEnabled(),
  validateSearch: searchSchema.parse,
  component: AdminResetLinkSentPage,
});
