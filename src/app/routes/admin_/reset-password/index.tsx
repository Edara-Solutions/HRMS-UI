import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { requireAdminConsoleEnabled } from "@/app/guards/auth-guards";
import { AdminResetPasswordPage } from "@/pages/admin/reset-password";

const searchSchema = z.object({
  token: z.string().min(1).optional().catch(undefined),
});

export const Route = createFileRoute("/admin_/reset-password/")({
  beforeLoad: () => requireAdminConsoleEnabled(),
  validateSearch: searchSchema.parse,
  component: AdminResetPasswordPage,
});
