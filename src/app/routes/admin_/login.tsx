import { createFileRoute } from "@tanstack/react-router";
import { requireAdminConsoleEnabled } from "@/app/guards/auth-guards";
import { AdminLoginPage } from "@/pages/admin/login";

export const Route = createFileRoute("/admin_/login")({
  beforeLoad: () => requireAdminConsoleEnabled(),
  component: AdminLoginPage,
});
