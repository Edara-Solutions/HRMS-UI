import { createFileRoute } from "@tanstack/react-router";
import { ForbiddenPage } from "@/pages/forbidden";

export const Route = createFileRoute("/forbidden/")({
  component: ForbiddenPage,
});
