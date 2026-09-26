import { QueryClientProvider } from "@tanstack/react-query";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AudienceSessionBoundary } from "@/app/guards/audience-session-boundary";
import { requireAuthenticated } from "@/app/guards/auth-guards";
import { companyQueryClient } from "@/shared/api";
import { AppShell } from "@/widgets/app-shell";

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
        <AppShell portal="company">
          <Outlet />
        </AppShell>
      </AudienceSessionBoundary>
    </QueryClientProvider>
  );
}
