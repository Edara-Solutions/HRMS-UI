import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext } from "@tanstack/react-router";
import { redirectIfMustChangePassword } from "@/app/guards/auth-guards";
import { NotFoundPage, RootLayout } from "@/app/-root-layout";

export interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  // Runs before any portal's `requireAuthenticated`, so an authenticated user
  // who must change their password is sent straight to /change-password —
  // never bounced through /login first.
  beforeLoad: ({ location }) => redirectIfMustChangePassword(location.pathname),
  component: RootLayout,
  notFoundComponent: NotFoundPage,
});
