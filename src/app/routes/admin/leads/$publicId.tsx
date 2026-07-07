import { createFileRoute } from "@tanstack/react-router";
import { AdminLeadDetailPage } from "@/pages/admin/lead-detail";

export const Route = createFileRoute("/admin/leads/$publicId")({
  component: AdminLeadDetailPage,
});
