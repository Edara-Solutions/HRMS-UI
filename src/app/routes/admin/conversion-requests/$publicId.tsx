import { createFileRoute } from "@tanstack/react-router";
import { AdminConversionRequestDetailPage } from "@/pages/admin/conversion-requests";

export const Route = createFileRoute("/admin/conversion-requests/$publicId")({
  component: AdminConversionRequestDetailPage,
});
