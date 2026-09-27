import { createFileRoute } from "@tanstack/react-router";
import {
  PlatformEmailDeliveriesPage,
  platformDeliveriesSearchSchema,
} from "@/pages/platform/email-deliveries";

export const Route = createFileRoute("/platform/email-deliveries/")({
  validateSearch: platformDeliveriesSearchSchema.parse,
  component: PlatformEmailDeliveriesPage,
});
