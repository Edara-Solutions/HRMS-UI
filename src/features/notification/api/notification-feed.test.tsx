import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthSession, SessionUser } from "@/shared/auth";
import { useAuthStore } from "@/shared/auth";
import { useNotificationFeed } from "./notification-feed";

const feedGetMock = vi.hoisted(() => vi.fn());

// `ky` builds AbortSignals that jsdom's fetch rejects as cross-realm — stub the client boundary
// instead of the network.
vi.mock("@/shared/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api")>()),
  apiClient: { get: feedGetMock },
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

function feedItem(id: number, createdAt: string) {
  return {
    id,
    scope: "company",
    typeKey: "company.user-joined",
    typeVersion: 1,
    importance: "normal",
    params: {},
    actor: { kind: "system" },
    subject: null,
    createdAt,
    seenAt: null,
    readAt: null,
  };
}

function feedPage(items: unknown[], nextCursor: string | null) {
  return { json: async () => ({ items, nextCursor, hasMore: nextCursor !== null }) };
}

function searchParamsOf(call: number) {
  return feedGetMock.mock.calls[call][1].searchParams as URLSearchParams;
}

function renderFeed(open: boolean) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return renderHook(({ isOpen }: { isOpen: boolean }) => useNotificationFeed(isOpen), {
    wrapper,
    initialProps: { isOpen: open },
  });
}

describe("useNotificationFeed", () => {
  beforeEach(() => {
    useAuthStore.setState({ session, status: "authenticated" });
  });

  afterEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ session: null, status: "anonymous" });
  });

  it("stays idle while the panel is closed", () => {
    renderFeed(false);

    expect(feedGetMock).not.toHaveBeenCalled();
  });

  it("pages by cursor at the contract limit and keeps one row per id", async () => {
    feedGetMock
      .mockReturnValueOnce(feedPage([feedItem(3, "2026-08-25T09:00:00.000Z")], "cursor-2"))
      .mockReturnValueOnce(
        feedPage(
          [feedItem(3, "2026-08-25T09:00:00.000Z"), feedItem(2, "2026-08-24T09:00:00.000Z")],
          null,
        ),
      );

    const { result } = renderFeed(true);

    await waitFor(() => expect(result.current.data).toHaveLength(1));
    expect(searchParamsOf(0).get("limit")).toBe("20");
    expect(searchParamsOf(0).has("cursor")).toBe(false);

    await act(async () => {
      await result.current.fetchNextPage();
    });

    await waitFor(() => expect(result.current.data).toHaveLength(2));
    expect(searchParamsOf(1).get("cursor")).toBe("cursor-2");
    expect(result.current.data?.map((item) => item.id)).toEqual([3, 2]);
  });

  it("catches up on reopen with a since delta merged into the cached rows", async () => {
    feedGetMock
      .mockReturnValueOnce(feedPage([feedItem(1, "2026-08-25T09:00:00.000Z")], null))
      .mockReturnValueOnce(feedPage([feedItem(5, "2026-08-25T10:00:00.000Z")], null));

    const { result, rerender } = renderFeed(true);
    await waitFor(() => expect(result.current.data).toHaveLength(1));

    await act(async () => {
      rerender({ isOpen: false });
    });
    await act(async () => {
      rerender({ isOpen: true });
    });

    await waitFor(() => expect(result.current.data).toHaveLength(2));
    expect(searchParamsOf(1).get("since")).toBe("2026-08-25T09:00:00.000Z");
    expect(result.current.data?.map((item) => item.id)).toEqual([5, 1]);
  });
});
