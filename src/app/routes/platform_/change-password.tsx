import { createFileRoute } from "@tanstack/react-router";
import { AudienceSessionBoundary } from "@/app/guards/audience-session-boundary";
import { requireAuthenticated, requirePlatformPortalEnabled } from "@/app/guards/auth-guards";
import { AudiencePasswordPage } from "@/pages/audience-password";

export const Route = createFileRoute("/platform_/change-password")({
  beforeLoad: () => {
    requirePlatformPortalEnabled();
    return requireAuthenticated({ audience: "platform", allowPasswordChange: true });
  },
  component: () => (
    <AudienceSessionBoundary audience="platform" view="password-completion">
      <AudiencePasswordPage audience="platform" />
    </AudienceSessionBoundary>
  ),
});
