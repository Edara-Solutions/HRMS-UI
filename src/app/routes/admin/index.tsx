import { createFileRoute } from "@tanstack/react-router";
import { AdminIndexPage } from "@/pages/admin/home";

export const Route = createFileRoute("/admin/")({
  component: AdminIndexPage,
});
