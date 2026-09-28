import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render } from "@testing-library/react";
import { Component, type ReactNode } from "react";
import { afterEach, vi } from "vitest";
import { useCompanySession, usePlatformSession } from "@/shared/auth";
import { i18next } from "@/shared/i18n";
import { platformSessionFixture } from "./audience-fixtures";
import { operationNetwork } from "./operation-request-mock";

const state = vi.hoisted(() => ({
  search: {} as Record<string, unknown>,
  navigations: [] as unknown[],
}));
export const searchState = state.search;
export const navigationCalls = state.navigations;
vi.mock("@tanstack/react-router", async (original) => {
  const actual = await original<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    useSearch: () => state.search,
    useNavigate: () => async (options: unknown) => {
      state.navigations.push(options);
    },
    Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>,
  };
});
class RefusalBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <p>Refused route</p> : this.props.children;
  }
}
export function communicationsRender(ui: ReactNode, permissions: string[]) {
  usePlatformSession.getState().setSession(platformSessionFixture({ permissions }));
  const network = operationNetwork.install();
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return {
    network,
    client,
    show: () =>
      render(
        <QueryClientProvider client={client}>
          <RefusalBoundary>{ui}</RefusalBoundary>
        </QueryClientProvider>,
      ),
  };
}
afterEach(() => {
  cleanup();
  usePlatformSession.getState().clearSession();
  useCompanySession.getState().clearSession();
  for (const key of Object.keys(searchState)) delete searchState[key];
  navigationCalls.length = 0;
  void i18next.changeLanguage("en");
});
