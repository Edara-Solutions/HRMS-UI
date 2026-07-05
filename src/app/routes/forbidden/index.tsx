import { createFileRoute } from "@tanstack/react-router";
import { ForbiddenPage } from "@/app/-forbidden.page";

export const Route = createFileRoute("/forbidden/")({
  component: ForbiddenPage,
});
