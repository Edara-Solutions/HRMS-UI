import { createFileRoute } from "@tanstack/react-router";
import { AudienceAuthPage } from "@/pages/audience-auth";
import { credentialSearchSchema } from "@/shared/auth";

export const Route = createFileRoute("/company_/reset-password")({
  validateSearch: credentialSearchSchema.parse,
  component: CredentialRoute,
});

function CredentialRoute() {
  return <AudienceAuthPage audience="company" mode="reset" search={Route.useSearch()} />;
}
