import { createFileRoute } from "@tanstack/react-router";
import { AdminCompanyDetailPage } from "./admin-company-detail.page";

export const Route = createFileRoute("/admin/companies/$publicId")({
  component: AdminCompanyDetailPage,
});
