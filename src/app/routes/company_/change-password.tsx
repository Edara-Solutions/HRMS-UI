import { createFileRoute } from "@tanstack/react-router";
import { AudienceSessionBoundary } from "@/app/guards/audience-session-boundary";
import { requireAuthenticated } from "@/app/guards/auth-guards";
import { AudiencePasswordPage } from "@/pages/audience-password";

export const Route = createFileRoute("/company_/change-password")({
  beforeLoad: () => requireAuthenticated({ allowPasswordChange: true }),
  component: () => (
    <AudienceSessionBoundary audience="company" view="password-completion">
      <AudiencePasswordPage audience="company" />
    </AudienceSessionBoundary>
  ),
});
