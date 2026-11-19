import { createFileRoute } from "@tanstack/react-router";
import { RefusalPage } from "@/pages/refusal";

export const Route = createFileRoute("/forbidden/")({
  component: () => <RefusalPage kind="forbidden" />,
});
