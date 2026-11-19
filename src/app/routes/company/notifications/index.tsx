import { createFileRoute } from "@tanstack/react-router";
import { CompanyNotificationRoutingPage } from "@/pages/company/notification-routing";

export const Route = createFileRoute("/company/notifications/")({
  component: CompanyNotificationRoutingPage,
});
