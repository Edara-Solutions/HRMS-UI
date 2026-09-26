import { createFileRoute } from "@tanstack/react-router";
import { AudienceSessionBoundary } from "@/app/guards/audience-session-boundary";
import { requireAdminConsoleEnabled, requireAuthenticated } from "@/app/guards/auth-guards";
import { AudiencePasswordPage } from "@/pages/audience-password";

export const Route = createFileRoute("/platform_/change-password")({
  beforeLoad: () => {
    requireAdminConsoleEnabled();
    return requireAuthenticated({ platformAdminOnly: true, allowPasswordChange: true });
  },
  component: () => (
    <AudienceSessionBoundary audience="platform" view="password-completion">
      <AudiencePasswordPage audience="platform" />
    </AudienceSessionBoundary>
  ),
});
