import { QueryClientProvider } from "@tanstack/react-query";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AudienceSessionBoundary } from "@/app/guards/audience-session-boundary";
import { requireAuthenticated, requirePlatformPortalEnabled } from "@/app/guards/auth-guards";
import { PlatformShell } from "@/app/portal-shells";
import { platformQueryClient } from "@/shared/api";

export const Route = createFileRoute("/platform")({
  beforeLoad: ({ location }) => {
    requirePlatformPortalEnabled();
    return requireAuthenticated({ audience: "platform", returnTo: location.href });
  },
  pendingComponent: () => (
    <AudienceSessionBoundary audience="platform">{null}</AudienceSessionBoundary>
  ),
  component: PlatformPortalShell,
});

function PlatformPortalShell() {
  return (
    <QueryClientProvider client={platformQueryClient}>
      <AudienceSessionBoundary audience="platform">
        <PlatformShell>
          <Outlet />
        </PlatformShell>
      </AudienceSessionBoundary>
    </QueryClientProvider>
  );
}
