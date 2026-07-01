import { createFileRoute } from "@tanstack/react-router";
import { requireAuthenticated } from "@/auth/guards";
import { CompanyLayout } from "./-company-layout";

export const Route = createFileRoute("/company")({
  beforeLoad: () => requireAuthenticated(),
  component: CompanyLayout,
});
