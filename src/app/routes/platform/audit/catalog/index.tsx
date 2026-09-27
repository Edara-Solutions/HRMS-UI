import { createFileRoute } from "@tanstack/react-router";
import { PlatformAuditCatalogPage } from "@/pages/platform/audit";

export const Route = createFileRoute("/platform/audit/catalog/")({
  component: PlatformAuditCatalogPage,
});
