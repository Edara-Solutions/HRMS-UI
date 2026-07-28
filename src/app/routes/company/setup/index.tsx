import { createFileRoute } from "@tanstack/react-router";
import { CompanySetupPage } from "@/pages/company/setup";

export const Route = createFileRoute("/company/setup/")({
  component: CompanySetupPage,
});
