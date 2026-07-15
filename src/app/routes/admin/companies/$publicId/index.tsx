import { createFileRoute } from "@tanstack/react-router";
import { AdminCompanyDetailPage } from "@/pages/admin/company-detail";

export const Route = createFileRoute("/admin/companies/$publicId/")({
  component: AdminCompanyDetailPage,
});
