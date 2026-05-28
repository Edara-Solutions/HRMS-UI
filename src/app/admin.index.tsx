import { createFileRoute } from "@tanstack/react-router";
import { AdminIndexPage } from "./-admin-index.page";

export const Route = createFileRoute("/admin/")({
  component: AdminIndexPage,
});
