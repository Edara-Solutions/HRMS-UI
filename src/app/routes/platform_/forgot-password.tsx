import { createFileRoute } from "@tanstack/react-router";
import { requirePlatformPortalEnabled } from "@/app/guards/auth-guards";
import { AudienceAuthPage } from "@/pages/audience-auth";
import { credentialSearchSchema } from "@/shared/auth";

export const Route = createFileRoute("/platform_/forgot-password")({
  beforeLoad: () => requirePlatformPortalEnabled(),
  validateSearch: credentialSearchSchema.parse,
  component: CredentialRoute,
});

function CredentialRoute() {
  return <AudienceAuthPage audience="platform" mode="recovery" search={Route.useSearch()} />;
}
