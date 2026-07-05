import { createFileRoute } from "@tanstack/react-router";
import { AdminCompanyDetailPage } from "@/app/admin-company-detail.page";

export const Route = createFileRoute("/admin/companies/$publicId")({
  component: AdminCompanyDetailPage,
});
