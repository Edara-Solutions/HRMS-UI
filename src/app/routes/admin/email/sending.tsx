import { createFileRoute } from "@tanstack/react-router";
import { requireAuthenticated } from "@/app/guards/auth-guards";
import { AdminEmailSendingPage } from "@/pages/admin/email-sending";

/** Platform Admin emergency sending pause/resume controls. */
export const Route = createFileRoute("/admin/email/sending")({
  beforeLoad: () => requireAuthenticated({ platformAdminOnly: true }),
  component: AdminEmailSendingPage,
});
