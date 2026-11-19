import { createFileRoute } from "@tanstack/react-router";
import { PlatformAuditPage, platformAuditSearchSchema } from "@/pages/platform/audit";

export const Route = createFileRoute("/platform/audit/")({
  validateSearch: platformAuditSearchSchema.parse,
  component: PlatformAuditPage,
});
