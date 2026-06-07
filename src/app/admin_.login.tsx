import { requireAdminConsoleEnabled } from "@/auth/guards";
import { createFileRoute } from "@tanstack/react-router";
import { AdminLoginPage } from "./admin-login.page";

export const Route = createFileRoute("/admin_/login")({
  beforeLoad: () => requireAdminConsoleEnabled(),
  component: AdminLoginPage,
});
