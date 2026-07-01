import { createFileRoute } from "@tanstack/react-router";
import { AdminLeadDetailPage } from "./admin-lead-detail.page";

export const Route = createFileRoute("/admin/leads/$publicId")({
  component: AdminLeadDetailPage,
});
