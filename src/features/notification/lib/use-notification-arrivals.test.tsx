import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthSession, SessionUser } from "@/shared/auth";
import { useAuthStore } from "@/shared/auth";
import type { NotificationFeedItem } from "../api/notification-feed";
import {
  recordPresentedNotifications,
  usePresentedNotifications,
} from "../model/notification-arrivals";
import { useToastStore } from "../model/toast-store";
import { useNotificationArrivals } from "./use-notification-arrivals";

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

/** A settled row the watch predates; the newest row of each response sets the `since` cursor. */
const historyItem = () => feedItem(1, "company.user-joined", "2026-08-25T09:00:00.000Z");

function feedItem(id: number, typeKey: string, createdAt: string): NotificationFeedItem {
  return {
    id,
    scope: "company",
    typeKey,
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

function feedPage(items: unknown[]) {
  return { json: async () => ({ items, nextCursor: null, hasMore: false }) };
}

function searchParamsOf(call: number) {
  return feedGetMock.mock.calls[call][1].searchParams as URLSearchParams;
}

/** Lets an in-flight poll finish so its ledger writes and announcements land inside act. */
async function settlePoll() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

/** Focus and visibility catch-ups share the interval's poll path, so an event stands in for a tick. */
async function focusTick() {
  await act(async () => {
    window.dispatchEvent(new Event("focus"));
    await settlePoll();
  });
}

describe("useNotificationArrivals", () => {
  beforeEach(() => {
    useAuthStore.setState({ session, status: "authenticated" });
  });

  afterEach(() => {
    // The mounted watcher re-renders on these resets, so the teardown runs inside act.
    act(() => {
      useAuthStore.setState({ session: null, status: "anonymous" });
      useToastStore.setState({ toasts: [], earlierCount: 0 });
      usePresentedNotifications.getState().clear();
    });
    vi.clearAllMocks();
  });

  it("presents the feed's existing rows on mount without announcing any of them", async () => {
    feedGetMock.mockReturnValueOnce(
      feedPage([feedItem(7, "company.role-assigned", "2026-08-25T08:00:00.000Z"), historyItem()]),
    );

    renderHook(() => useNotificationArrivals());
    await settlePoll();

    expect(searchParamsOf(0).has("since")).toBe(false);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it("announces a high-importance arrival from the next tick at the cursor", async () => {
    feedGetMock
      .mockReturnValueOnce(feedPage([historyItem()]))
      .mockReturnValueOnce(
        feedPage([feedItem(2, "company.role-assigned", "2026-08-25T09:30:00.000Z")]),
      );

    renderHook(() => useNotificationArrivals());
    await settlePoll();

    await focusTick();

    expect(searchParamsOf(1).get("since")).toBe("2026-08-25T09:00:00.000Z");

    const [toast] = useToastStore.getState().toasts;
    expect(toast?.typeKey).toBe("company.role-assigned");
  });

  it("lets a normal-importance arrival wait in the bell", async () => {
    feedGetMock
      .mockReturnValueOnce(feedPage([historyItem()]))
      .mockReturnValueOnce(
        feedPage([feedItem(2, "company.user-joined", "2026-08-25T09:30:00.000Z")]),
      );

    renderHook(() => useNotificationArrivals());
    await settlePoll();

    await focusTick();

    expect(feedGetMock).toHaveBeenCalledTimes(2);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it("announces one card for a batch that lands at once, not the whole backlog", async () => {
    feedGetMock
      .mockReturnValueOnce(feedPage([historyItem()]))
      .mockReturnValueOnce(
        feedPage([
          feedItem(4, "company.role-assigned", "2026-08-25T10:00:00.000Z"),
          feedItem(3, "platform.conversion-requested", "2026-08-25T09:45:00.000Z"),
          feedItem(2, "company.user-joined", "2026-08-25T09:30:00.000Z"),
        ]),
      );

    renderHook(() => useNotificationArrivals());
    await settlePoll();

    await focusTick();

    const [toast] = useToastStore.getState().toasts;
    expect(toast?.typeKey).toBe("company.role-assigned");
    expect(useToastStore.getState().toasts).toHaveLength(1);
  });

  it("never announces the same id twice across ticks", async () => {
    const arrival = feedItem(2, "company.role-assigned", "2026-08-25T09:30:00.000Z");
    feedGetMock
      .mockReturnValueOnce(feedPage([historyItem()]))
      .mockReturnValueOnce(feedPage([arrival]))
      .mockReturnValueOnce(feedPage([arrival]));

    renderHook(() => useNotificationArrivals());
    await settlePoll();

    await focusTick();
    await focusTick();

    expect(useToastStore.getState().toasts).toHaveLength(1);
  });

  it("keeps the cursor through a failed tick and announces once it recovers", async () => {
    feedGetMock
      .mockReturnValueOnce(feedPage([historyItem()]))
      .mockImplementationOnce(() => Promise.reject(new Error("offline")))
      .mockReturnValueOnce(
        feedPage([feedItem(2, "company.role-assigned", "2026-08-25T09:30:00.000Z")]),
      );

    renderHook(() => useNotificationArrivals());
    await settlePoll();

    await focusTick();
    await focusTick();

    expect(searchParamsOf(2).get("since")).toBe("2026-08-25T09:00:00.000Z");
    expect(useToastStore.getState().toasts).toHaveLength(1);
  });

  it("pauses while the tab is hidden and catches up once it returns", async () => {
    const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(true);

    feedGetMock
      .mockReturnValueOnce(feedPage([historyItem()]))
      .mockReturnValueOnce(
        feedPage([feedItem(2, "company.role-assigned", "2026-08-25T09:30:00.000Z")]),
      );

    renderHook(() => useNotificationArrivals());

    await focusTick();
    expect(feedGetMock).not.toHaveBeenCalled();

    hidden.mockRestore();
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
      await settlePoll();
    });

    // The catch-up is a fresh sweep: what hid with the tab is history, the next tick announces.
    expect(searchParamsOf(0).has("since")).toBe(false);
    expect(useToastStore.getState().toasts).toHaveLength(0);

    await focusTick();

    expect(searchParamsOf(1).get("since")).toBe("2026-08-25T09:00:00.000Z");
    expect(useToastStore.getState().toasts).toHaveLength(1);
  });

  it("does not announce what the panel has already presented", async () => {
    recordPresentedNotifications([
      feedItem(2, "company.role-assigned", "2026-08-25T09:30:00.000Z"),
    ]);
    feedGetMock
      .mockReturnValueOnce(feedPage([historyItem()]))
      .mockReturnValueOnce(
        feedPage([feedItem(2, "company.role-assigned", "2026-08-25T09:30:00.000Z")]),
      );

    renderHook(() => useNotificationArrivals());
    await settlePoll();

    await focusTick();

    expect(feedGetMock).toHaveBeenCalledTimes(2);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });
});
