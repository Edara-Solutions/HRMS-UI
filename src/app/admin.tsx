import { createFileRoute } from "@tanstack/react-router";
import { requireAdminConsoleEnabled, requireAuthenticated } from "@/auth/guards";
import { AdminLayout } from "./admin-layout";

export const Route = createFileRoute("/admin")({
  beforeLoad: () => {
    requireAdminConsoleEnabled();
    return requireAuthenticated({ platformAdminOnly: true });
  },
  component: AdminLayout,
});
