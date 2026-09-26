import { createFileRoute } from "@tanstack/react-router";
import { requireAdminConsoleEnabled } from "@/app/guards/auth-guards";
import { AudienceAuthPage } from "@/pages/audience-auth";
import { credentialSearchSchema } from "@/shared/auth";

export const Route = createFileRoute("/platform_/login")({
  beforeLoad: () => requireAdminConsoleEnabled(),
  validateSearch: credentialSearchSchema.parse,
  component: CredentialRoute,
});

function CredentialRoute() {
  return <AudienceAuthPage audience="platform" mode="login" search={Route.useSearch()} />;
}
