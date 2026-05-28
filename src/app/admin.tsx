import { requireAuthenticated } from "@/auth/guards";
import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "./admin-layout";

export const Route = createFileRoute("/admin")({
  beforeLoad: () => requireAuthenticated({ platformAdminOnly: true }),
  component: AdminLayout,
});
