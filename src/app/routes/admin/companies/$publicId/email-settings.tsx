import { createFileRoute } from "@tanstack/react-router";
import { AdminCompanyEmailSettingsPage } from "@/pages/admin/company-email-settings";

export const Route = createFileRoute("/admin/companies/$publicId/email-settings")({
  component: AdminCompanyEmailSettingsPage,
});
