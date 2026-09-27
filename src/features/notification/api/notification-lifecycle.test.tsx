import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AudienceSessionProvider, useCompanySession } from "@/shared/auth";
import { companySessionFixture } from "../../../test/audience-fixtures";
import { notificationId, notificationItem } from "../../../test/notification-fixtures";
import { operationNetwork } from "../../../test/operation-request-mock";
import { notificationKeys } from "../model/notification-keys";
import { useBulkReadCursor } from "../model/notification-read-state";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useMarkNotificationsSeen,
} from "./notification-lifecycle";
import type { NotificationFeedItem } from "./notification-transport";

const session = companySessionFixture();
const scope = { tier: "company" as const, userPublicId: session.user.publicId };
const scopeKey = `company:${session.user.publicId}`;
const seenKey = "POST /api/v1/company/notifications/seen";
const readKey = "POST /api/v1/company/notifications/read";

function row(n: number): NotificationFeedItem {
  const { actor: _actor, ...item } = notificationItem(n);
  return {
    ...item,
    typeVersion: 1,
    importance: "normal",
    params: {},
    subject: null,
    seenAt: null,
    readAt: null,
    createdAt: item.createdAt,
    publicId: item.publicId,
    typeKey: item.typeKey,
  };
}

function seededClient(unreadCount: number, items: NotificationFeedItem[]) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  queryClient.setQueryData(notificationKeys.list(scope), {
    pages: [{ items, nextCursor: null, hasMore: false }],
    pageParams: [null],
  });
  queryClient.setQueryData(notificationKeys.count(scope), unreadCount);

  return queryClient;
}

function cachedItems(queryClient: QueryClient): NotificationFeedItem[] {
  const feed = queryClient.getQueryData<{ pages: { items: NotificationFeedItem[] }[] }>(
    notificationKeys.list(scope),
  );

  return feed?.pages.flatMap((page) => page.items) ?? [];
}

function cachedCount(queryClient: QueryClient) {
  return queryClient.getQueryData<number>(notificationKeys.count(scope));
}

function renderLifecycle<T>(useLifecycle: () => T, queryClient: QueryClient) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <AudienceSessionProvider audience="company">
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </AudienceSessionProvider>
  );

  return renderHook(useLifecycle, { wrapper });
}

function network({ fail = false } = {}) {
  const net = operationNetwork.install();
  net.on(seenKey, () => {
    if (fail) throw new TypeError("Failed to fetch");
    return { status: 200, body: { seenCount: 2 } };
  });
  net.on(readKey, () => {
    if (fail) throw new TypeError("Failed to fetch");
    return { status: 204 };
  });
  net.on("GET /api/v1/company/notifications", () => ({
    status: 200,
    body: { items: [], nextCursor: null, hasMore: false },
  }));
  net.on("GET /api/v1/company/notifications/unread-count", () => ({
    status: 200,
    body: { unreadCount: 0 },
  }));
  return net;
}

describe("notification lifecycle mutations", () => {
  beforeEach(() => useCompanySession.getState().setSession(session));

  afterEach(() => {
    useCompanySession.getState().clearSession();
    useBulkReadCursor.setState({ cursors: {} });
  });

  it("stamps the rows seen by public ID and drains the badge without marking them read", async () => {
    const net = network();
    const queryClient = seededClient(2, [row(1), row(2)]);
    const { result } = renderLifecycle(useMarkNotificationsSeen, queryClient);

    await act(async () => {
      await result.current.mutateAsync([notificationId(1), notificationId(2)]);
    });

    expect(net.calls.find((call) => call.key === seenKey)).toEqual({
      audience: "company",
      key: seenKey,
      input: { body: { publicIds: [notificationId(1), notificationId(2)] } },
    });
    expect(cachedItems(queryClient).every((item) => item.seenAt !== null)).toBe(true);
    expect(cachedItems(queryClient).every((item) => item.readAt === null)).toBe(true);
  });

  it("rolls the rows and the badge back when marking seen fails", async () => {
    network({ fail: true });
    const queryClient = seededClient(2, [row(1), row(2)]);
    const { result } = renderLifecycle(useMarkNotificationsSeen, queryClient);

    act(() => {
      result.current.mutate([notificationId(1), notificationId(2)]);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(cachedItems(queryClient).every((item) => item.seenAt === null)).toBe(true);
  });

  it("marks only the activated row read", async () => {
    const net = network();
    const queryClient = seededClient(2, [row(1), row(2)]);
    const { result } = renderLifecycle(useMarkNotificationRead, queryClient);

    await act(async () => {
      await result.current.mutateAsync(notificationId(1));
    });

    expect(net.calls.find((call) => call.key === readKey)?.input).toEqual({
      body: { publicId: notificationId(1) },
    });
    expect(
      cachedItems(queryClient).find((item) => item.publicId === notificationId(1))?.readAt,
    ).not.toBeNull();
    expect(
      cachedItems(queryClient).find((item) => item.publicId === notificationId(2))?.readAt,
    ).toBeNull();
  });

  it("advances this identity's bulk-read cursor only", async () => {
    const net = network();
    useBulkReadCursor.setState({ cursors: { "platform:someone": "2026-01-01T00:00:00.000Z" } });
    const queryClient = seededClient(2, [row(1), row(2)]);
    const { result } = renderLifecycle(useMarkAllNotificationsRead, queryClient);

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(net.calls.find((call) => call.key === readKey)?.input).toEqual({ body: { all: true } });
    expect(useBulkReadCursor.getState().cursors[scopeKey]).toBeDefined();
    expect(useBulkReadCursor.getState().cursors["platform:someone"]).toBe(
      "2026-01-01T00:00:00.000Z",
    );
  });

  it("returns the bulk-read cursor and badge to where they were when mark-all fails", async () => {
    network({ fail: true });
    const queryClient = seededClient(2, [row(1), row(2)]);
    const { result } = renderLifecycle(useMarkAllNotificationsRead, queryClient);

    act(() => {
      result.current.mutate();
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(useBulkReadCursor.getState().cursors[scopeKey]).toBeUndefined();
    expect(cachedCount(queryClient)).toBe(2);
  });
});
