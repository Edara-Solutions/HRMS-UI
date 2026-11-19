import { QueryClientProvider } from "@tanstack/react-query";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AudienceSessionBoundary } from "@/app/guards/audience-session-boundary";
import { requireAuthenticated } from "@/app/guards/auth-guards";
import { CompanyShell } from "@/app/portal-shells";
import { companyQueryClient } from "@/shared/api";

export const Route = createFileRoute("/company")({
  beforeLoad: ({ location }) => requireAuthenticated({ returnTo: location.href }),
  pendingComponent: () => (
    <AudienceSessionBoundary audience="company">{null}</AudienceSessionBoundary>
  ),
  component: CompanyPortalShell,
});

function CompanyPortalShell() {
  return (
    <QueryClientProvider client={companyQueryClient}>
      <AudienceSessionBoundary audience="company">
        <CompanyShell>
          <Outlet />
        </CompanyShell>
      </AudienceSessionBoundary>
    </QueryClientProvider>
  );
}
