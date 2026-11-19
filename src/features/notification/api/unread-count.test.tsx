import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import {
  type AudienceName,
  AudienceSessionProvider,
  useCompanySession,
  usePlatformSession,
} from "@/shared/auth";
import { companySessionFixture, platformSessionFixture } from "../../../test/audience-fixtures";
import { operationNetwork } from "../../../test/operation-request-mock";
import { useUnreadNotificationCount } from "./unread-count";

function renderCount(audience: AudienceName) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <AudienceSessionProvider audience={audience}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </AudienceSessionProvider>
  );
  return renderHook(() => useUnreadNotificationCount(), { wrapper });
}

afterEach(() => {
  useCompanySession.getState().clearSession();
  usePlatformSession.getState().clearSession();
});

describe("useUnreadNotificationCount", () => {
  it("reads the declared Company unread-count operation, never the feed", async () => {
    const net = operationNetwork.install();
    net.on("GET /api/v1/company/notifications/unread-count", () => ({
      status: 200,
      body: { unreadCount: 3 },
    }));
    useCompanySession.getState().setSession(companySessionFixture());

    const { result } = renderCount("company");

    await waitFor(() => expect(result.current.data).toBe(3));
    expect(net.calls.map((call) => [call.audience, call.key])).toEqual([
      ["company", "GET /api/v1/company/notifications/unread-count"],
    ]);
  });

  it("uses the Platform audience's own operation and client", async () => {
    const net = operationNetwork.install();
    net.on("GET /api/v1/platform/notifications/unread-count", () => ({
      status: 200,
      body: { unreadCount: 8 },
    }));
    usePlatformSession.getState().setSession(platformSessionFixture());

    const { result } = renderCount("platform");

    await waitFor(() => expect(result.current.data).toBe(8));
    expect(net.calls[0]?.audience).toBe("platform");
  });

  it("treats a malformed count as a contract violation", async () => {
    const net = operationNetwork.install();
    net.on("GET /api/v1/company/notifications/unread-count", () => ({
      status: 200,
      body: { unreadCount: -1 },
    }));
    useCompanySession.getState().setSession(companySessionFixture());

    const { result } = renderCount("company");

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.name).toBe("ContractViolation");
  });
});
