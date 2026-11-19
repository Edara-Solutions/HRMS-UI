import { createFileRoute } from "@tanstack/react-router";
import { PlatformRolesPage } from "@/pages/platform/roles";

export const Route = createFileRoute("/platform/roles/")({
  component: PlatformRolesPage,
});
