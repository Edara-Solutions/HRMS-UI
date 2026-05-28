import { requireAuthenticated } from "@/auth/guards";
import { createFileRoute } from "@tanstack/react-router";
import { CompanyLayout } from "./-company-layout";

export const Route = createFileRoute("/company")({
  beforeLoad: () => requireAuthenticated(),
  component: CompanyLayout,
});
