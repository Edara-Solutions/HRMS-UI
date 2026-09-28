import { createFileRoute } from "@tanstack/react-router";
import { PlatformNotificationSettingsPage } from "@/pages/platform/notifications";

export const Route = createFileRoute("/platform/notifications/")({
  component: PlatformNotificationSettingsPage,
});
