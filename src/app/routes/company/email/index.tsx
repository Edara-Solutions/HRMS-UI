import { createFileRoute } from "@tanstack/react-router";
import { CompanyEmailSettingsPage } from "@/pages/company/email-settings";

export const Route = createFileRoute("/company/email/")({
  component: CompanyEmailSettingsPage,
});
