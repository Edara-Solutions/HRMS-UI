import { createFileRoute } from "@tanstack/react-router";
import { PlatformEmailSendingPage } from "@/pages/platform/email-sending";

export const Route = createFileRoute("/platform/email-sending/")({
  component: PlatformEmailSendingPage,
});
