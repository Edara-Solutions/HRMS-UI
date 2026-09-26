import { QueryClientProvider } from "@tanstack/react-query";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AudienceSessionBoundary } from "@/app/guards/audience-session-boundary";
import { requireAdminConsoleEnabled, requireAuthenticated } from "@/app/guards/auth-guards";
import { platformQueryClient } from "@/shared/api";
import { AppShell } from "@/widgets/app-shell";

export const Route = createFileRoute("/admin")({
  beforeLoad: () => {
    requireAdminConsoleEnabled();
    return requireAuthenticated({ platformAdminOnly: true });
  },
  component: AdminPortalShell,
});

function AdminPortalShell() {
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
