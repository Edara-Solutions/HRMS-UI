import { createFileRoute } from "@tanstack/react-router";
import { PlatformSubscriptionsPage } from "@/pages/platform/subscriptions";
export const Route = createFileRoute("/platform/subscriptions/")({
  component: PlatformSubscriptionsPage,
});
