import { createFileRoute } from "@tanstack/react-router";
import { requireAuthenticated } from "@/app/guards/auth-guards";
import { CompanyEmailSettingsPage } from "@/pages/company/email-settings";

export const Route = createFileRoute("/company/email-settings/")({
  beforeLoad: () =>
    requireAuthenticated({ requiredPermissions: ["companies:email-settings:read"] }),
  component: CompanyEmailSettingsPage,
});
