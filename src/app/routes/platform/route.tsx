import { QueryClientProvider } from "@tanstack/react-query";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AudienceSessionBoundary } from "@/app/guards/audience-session-boundary";
import { requireAdminConsoleEnabled, requireAuthenticated } from "@/app/guards/auth-guards";
import { platformQueryClient } from "@/shared/api";
import { AppShell } from "@/widgets/app-shell";

export const Route = createFileRoute("/platform")({
  beforeLoad: ({ location }) => {
    requireAdminConsoleEnabled();
    return requireAuthenticated({ platformAdminOnly: true, returnTo: location.href });
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
        <AppShell portal="admin">
          <Outlet />
        </AppShell>
      </AudienceSessionBoundary>
    </QueryClientProvider>
  );
}
