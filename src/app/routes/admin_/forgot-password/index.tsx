/*
 * Lives in `admin_/` for the same reason `admin_/login` does: it serves `/admin/forgot-password`
 * while escaping the admin portal shell and its authentication guard. Someone who has lost their
 * password cannot be authenticated first.
 */
import { createFileRoute } from "@tanstack/react-router";
import { requireAdminConsoleEnabled } from "@/app/guards/auth-guards";
import { AdminForgotPasswordPage } from "@/pages/admin/forgot-password";

export const Route = createFileRoute("/admin_/forgot-password/")({
  beforeLoad: () => requireAdminConsoleEnabled(),
  component: AdminForgotPasswordPage,
});
