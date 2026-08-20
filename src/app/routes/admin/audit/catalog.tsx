import { createFileRoute } from "@tanstack/react-router";
import { AdminAuditCatalogPage } from "@/pages/admin/audit";

export const Route = createFileRoute("/admin/audit/catalog")({
  component: AdminAuditCatalogPage,
});
