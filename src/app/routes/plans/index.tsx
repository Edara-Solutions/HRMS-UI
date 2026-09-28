import { createFileRoute } from "@tanstack/react-router";
import { PublicPlansPage } from "@/pages/public-plans";

export const Route = createFileRoute("/plans/")({
  component: PublicPlansPage,
});
