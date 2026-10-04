import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AudienceSessionProvider, useCompanySession } from "@/shared/auth";
import { companySessionFixture } from "../../../test/audience-fixtures";
import {
  notificationId,
  notificationItem,
  notificationPage,
} from "../../../test/notification-fixtures";
import { operationNetwork } from "../../../test/operation-request-mock";
import { useNotificationFeed } from "./notification-feed";

const feedKey = "GET /api/v1/company/notifications";

function renderFeed(open: boolean) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <AudienceSessionProvider audience="company">
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </AudienceSessionProvider>
  );

  return renderHook(({ isOpen }: { isOpen: boolean }) => useNotificationFeed(isOpen), {
    wrapper,
    initialProps: { isOpen: open },
  });
}

function queuedPages(...pages: unknown[]) {
  const net = operationNetwork.install();
  let call = 0;
  net.on(feedKey, () => ({ status: 200, body: pages[Math.min(call++, pages.length - 1)] }));
  return net;
}

describe("useNotificationFeed", () => {
  beforeEach(() => useCompanySession.getState().setSession(companySessionFixture()));
  afterEach(() => useCompanySession.getState().clearSession());

  it("stays idle while the panel is closed", () => {
    const net = queuedPages(notificationPage([]));
    renderFeed(false);

    expect(net.count(feedKey)).toBe(0);
  });

  it("pages by cursor at the contract limit through the Company client and keeps one row per ID", async () => {
    const net = queuedPages(
      notificationPage([notificationItem(3, "2026-08-25T09:00:00.000Z")], "cursor-2"),
      notificationPage([
        notificationItem(3, "2026-08-25T09:00:00.000Z"),
        notificationItem(2, "2026-08-24T09:00:00.000Z"),
      ]),
    );

    const { result } = renderFeed(true);

    await waitFor(() => expect(result.current.data).toHaveLength(1));
    expect(net.calls[0]).toEqual({
      audience: "company",
      key: feedKey,
      input: { query: { limit: 20 } },
    });

    await act(async () => {
      await result.current.fetchNextPage();
    });

    await waitFor(() => expect(result.current.data).toHaveLength(2));
    expect(net.calls[1]?.input).toEqual({ query: { limit: 20, cursor: "cursor-2" } });
    expect(result.current.data?.map((item) => item.publicId)).toEqual([
      notificationId(3),
      notificationId(2),
    ]);
    expect(result.current.data?.[0]).not.toHaveProperty("actor");
  });

  it("catches up on reopen with a since delta merged into the cached rows", async () => {
    const net = queuedPages(
      notificationPage([notificationItem(1, "2026-08-25T09:00:00.000Z")]),
      notificationPage([notificationItem(5, "2026-08-25T10:00:00.000Z")]),
    );

    const { result, rerender } = renderFeed(true);
    await waitFor(() => expect(result.current.data).toHaveLength(1));

    await act(async () => {
      rerender({ isOpen: false });
    });
    await act(async () => {
      rerender({ isOpen: true });
    });

    await waitFor(() => expect(result.current.data).toHaveLength(2));
    expect(net.calls[1]?.input).toEqual({
      query: { limit: 20, since: "2026-08-25T09:00:00.000Z" },
    });
    expect(result.current.data?.map((item) => item.publicId)).toEqual([
      notificationId(5),
      notificationId(1),
    ]);
  });

  it("rejects a malformed feed instead of rendering it", async () => {
    queuedPages({
      items: [{ id: 1, typeKey: "company.user-joined" }],
      nextCursor: null,
      hasMore: false,
    });

    const { result } = renderFeed(true);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.name).toBe("ContractViolation");
  });
});
