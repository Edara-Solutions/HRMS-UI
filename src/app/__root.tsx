import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext } from "@tanstack/react-router";
import { NotFoundPage, RootLayout } from "./-root-layout";

export interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  notFoundComponent: NotFoundPage,
});
