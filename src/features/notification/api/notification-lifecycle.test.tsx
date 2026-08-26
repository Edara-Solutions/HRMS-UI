import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthSession, SessionUser } from "@/shared/auth";
import { useAuthStore } from "@/shared/auth";
import { notificationKeys } from "../model/notification-keys";
import { useBulkReadCursor } from "../model/notification-read-state";
import type { NotificationFeedItem } from "./notification-feed";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useMarkNotificationsSeen,
} from "./notification-lifecycle";

const postMock = vi.hoisted(() => vi.fn());

// `ky` builds AbortSignals that jsdom's fetch rejects as cross-realm — stub the client boundary
// instead of the network.
vi.mock("@/shared/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api")>()),
  apiClient: { post: postMock },
}));

const baseUser: SessionUser = {
  publicId: "user-1",
  employeeCode: "EMP-001",
  firstName: "Jane",
  lastName: "Doe",
  email: "jane@example.com",
  status: "ACTIVE",
  companyCode: "ACME",
  mustChangePassword: false,
  permissions: [],
  isOwner: false,
  isPlatformAdmin: false,
};

const session: AuthSession = {
  accessToken: "access-token",
  refreshToken: "refresh-token",
  sessionId: "session-1",
  expiresIn: 900,
  user: baseUser,
};

function feedItem(id: number): NotificationFeedItem {
  return {
    id,
    scope: "company",
    typeKey: "company.user-joined",
    typeVersion: 1,
    importance: "normal",
    params: {},
    actor: { kind: "system" },
    subject: null,
    createdAt: `2026-08-25T0${id}:00:00.000Z`,
    seenAt: null,
    readAt: null,
  };
}

function seededClient(unreadCount: number, items: NotificationFeedItem[]) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  queryClient.setQueryData(notificationKeys.list(null), {
    pages: [{ items, nextCursor: null, hasMore: false }],
    pageParams: [null],
  });
  queryClient.setQueryData(notificationKeys.count(), { unreadCount, pollIntervalMs: 30_000 });

  return queryClient;
}

function cachedItems(queryClient: QueryClient): NotificationFeedItem[] {
  const feed = queryClient.getQueryData<{ pages: { items: NotificationFeedItem[] }[] }>(
    notificationKeys.list(null),
  );

  return feed?.pages.flatMap((page) => page.items) ?? [];
}

function cachedCount(queryClient: QueryClient) {
  return queryClient.getQueryData<{ unreadCount: number }>(notificationKeys.count())?.unreadCount;
}

function renderLifecycle<T>(useLifecycle: () => T, queryClient: QueryClient) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return renderHook(useLifecycle, { wrapper });
}

describe("notification lifecycle mutations", () => {
  beforeEach(() => {
    useAuthStore.setState({ session, status: "authenticated" });
    postMock.mockResolvedValue(new Response(null, { status: 204 }));
  });

  afterEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ session: null, status: "anonymous" });
    useBulkReadCursor.setState({ cursorAt: null });
  });

  it("stamps the rows seen and drains the badge before the request resolves", async () => {
    const queryClient = seededClient(2, [feedItem(1), feedItem(2)]);
    const { result } = renderLifecycle(useMarkNotificationsSeen, queryClient);

    await act(async () => {
      await result.current.mutateAsync([1, 2]);
    });

    expect(postMock).toHaveBeenCalledWith("company/notifications/seen", { json: { ids: [1, 2] } });
    expect(cachedItems(queryClient).every((item) => item.seenAt !== null)).toBe(true);
    expect(cachedCount(queryClient)).toBe(0);
  });

  it("rolls the rows and the badge back when marking seen fails", async () => {
    postMock.mockRejectedValue(new Error("network down"));
    const queryClient = seededClient(2, [feedItem(1), feedItem(2)]);
    const { result } = renderLifecycle(useMarkNotificationsSeen, queryClient);

    act(() => {
      result.current.mutate([1, 2]);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(cachedItems(queryClient).every((item) => item.seenAt === null)).toBe(true);
    expect(cachedCount(queryClient)).toBe(2);
  });

  it("marks only the activated row read", async () => {
    const queryClient = seededClient(2, [feedItem(1), feedItem(2)]);
    const { result } = renderLifecycle(useMarkNotificationRead, queryClient);

    await act(async () => {
      await result.current.mutateAsync(1);
    });

    expect(postMock).toHaveBeenCalledWith("company/notifications/read", { json: { id: 1 } });
    expect(cachedItems(queryClient).find((item) => item.id === 1)?.readAt).not.toBeNull();
    expect(cachedItems(queryClient).find((item) => item.id === 2)?.readAt).toBeNull();
    expect(cachedCount(queryClient)).toBe(1);
  });

  it("advances the bulk-read cursor and empties the badge", async () => {
    const queryClient = seededClient(2, [feedItem(1), feedItem(2)]);
    const { result } = renderLifecycle(useMarkAllNotificationsRead, queryClient);

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(postMock).toHaveBeenCalledWith("company/notifications/read", { json: { all: true } });
    expect(useBulkReadCursor.getState().cursorAt).not.toBeNull();
    expect(cachedCount(queryClient)).toBe(0);
  });

  it("returns the bulk-read cursor to where it was when mark-all fails", async () => {
    postMock.mockRejectedValue(new Error("network down"));
    const queryClient = seededClient(2, [feedItem(1), feedItem(2)]);
    const { result } = renderLifecycle(useMarkAllNotificationsRead, queryClient);

    act(() => {
      result.current.mutate();
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(useBulkReadCursor.getState().cursorAt).toBeNull();
    expect(cachedCount(queryClient)).toBe(2);
  });
});
