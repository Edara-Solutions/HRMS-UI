import { createFileRoute } from "@tanstack/react-router";
import { PlatformEmailsPage } from "@/pages/platform/emails";

export const Route = createFileRoute("/platform/emails/")({
  component: PlatformEmailsPage,
});
