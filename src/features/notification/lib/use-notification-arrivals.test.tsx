import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type AudienceName,
  AudienceSessionProvider,
  useCompanySession,
  usePlatformSession,
} from "@/shared/auth";
import { companySessionFixture, platformSessionFixture } from "../../../test/audience-fixtures";
import {
  notificationItem,
  notificationPage,
  notificationRow,
} from "../../../test/notification-fixtures";
import { operationNetwork } from "../../../test/operation-request-mock";
import {
  recordPresentedNotifications,
  usePresentedNotifications,
} from "../model/notification-arrivals";
import { useToastStore } from "../model/toast-store";
import { useNotificationArrivals } from "./use-notification-arrivals";

type Reply = unknown[] | "offline";

/** A settled row the watch predates; the newest row of each response sets the `since` cursor. */
const historyItem = () =>
  notificationItem(1, "2026-08-25T09:00:00.000Z", { typeKey: "company.user-joined" });

function item(n: number, typeKey: string, createdAt: string) {
  return notificationItem(n, createdAt, { typeKey });
}

/** Queues one reply per feed request, in order; the last reply repeats. */
function feedReplies(audience: AudienceName, ...replies: Reply[]) {
  const net = operationNetwork.install();
  let call = 0;
  net.on(`GET /api/v1/${audience}/notifications`, () => {
    const reply = replies[Math.min(call++, replies.length - 1)];
    if (reply === "offline") throw new TypeError("Failed to fetch");
    return { status: 200, body: notificationPage(reply ?? []) };
  });
  return net;
}

function sinceOf(net: ReturnType<typeof feedReplies>, call: number) {
  const input = net.calls[call]?.input;
  return typeof input === "object" && input !== null && "query" in input
    ? (input.query as { since?: string }).since
    : undefined;
}

/** Lets an in-flight poll finish so its ledger writes and announcements land inside act. */
async function settlePoll() {
  await act(async () => {
    for (let tick = 0; tick < 6; tick += 1) await Promise.resolve();
  });
}

/** Focus and visibility catch-ups share the interval's poll path, so an event stands in for a tick. */
async function focusTick() {
  await act(async () => {
    window.dispatchEvent(new Event("focus"));
  });
  await settlePoll();
}

function watch(audience: AudienceName = "company") {
  return renderHook(() => useNotificationArrivals(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <AudienceSessionProvider audience={audience}>{children}</AudienceSessionProvider>
    ),
  });
}

describe("useNotificationArrivals", () => {
  beforeEach(() => {
    useCompanySession.getState().setSession(companySessionFixture());
  });

  afterEach(() => {
    // The mounted watcher re-renders on these resets, so the teardown runs inside act.
    act(() => {
      useCompanySession.getState().clearSession();
      usePlatformSession.getState().clearSession();
      useToastStore.setState({ toasts: [], earlierCount: 0 });
      usePresentedNotifications.getState().clear();
    });
  });

  it("presents the feed's existing rows on mount without announcing any of them", async () => {
    const net = feedReplies("company", [
      item(7, "company.role-assigned", "2026-08-25T08:00:00.000Z"),
      historyItem(),
    ]);

    watch();
    await settlePoll();

    expect(sinceOf(net, 0)).toBeUndefined();
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it("announces a high-importance arrival from the next tick at the cursor", async () => {
    const net = feedReplies(
      "company",
      [historyItem()],
      [item(2, "company.role-assigned", "2026-08-25T09:30:00.000Z")],
    );

    watch();
    await settlePoll();
    await focusTick();

    expect(sinceOf(net, 1)).toBe("2026-08-25T09:00:00.000Z");
    expect(useToastStore.getState().toasts[0]?.typeKey).toBe("company.role-assigned");
  });

  it("announces a new Lead on the Platform audience only", async () => {
    act(() => {
      useCompanySession.getState().clearSession();
      usePlatformSession.getState().setSession(platformSessionFixture());
    });
    feedReplies(
      "platform",
      [historyItem()],
      [item(2, "platform.lead-created", "2026-08-25T09:30:00.000Z")],
    );

    watch("platform");
    await settlePoll();
    await focusTick();

    expect(useToastStore.getState().toasts[0]).toMatchObject({
      tier: "platform",
      typeKey: "platform.lead-created",
    });
  });

  it("never toasts another audience's or an unknown type", async () => {
    feedReplies(
      "company",
      [historyItem()],
      [
        item(3, "platform.lead-created", "2026-08-25T09:45:00.000Z"),
        item(2, "company.unknown-type", "2026-08-25T09:30:00.000Z"),
      ],
    );

    watch();
    await settlePoll();
    await focusTick();

    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it("lets a normal-importance arrival wait in the bell", async () => {
    const net = feedReplies(
      "company",
      [historyItem()],
      [item(2, "company.user-joined", "2026-08-25T09:30:00.000Z")],
    );

    watch();
    await settlePoll();
    await focusTick();

    expect(net.count("GET /api/v1/company/notifications")).toBe(2);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it("announces one card for a batch that lands at once, not the whole backlog", async () => {
    feedReplies(
      "company",
      [historyItem()],
      [
        item(4, "company.role-assigned", "2026-08-25T10:00:00.000Z"),
        item(3, "company.subscription-changed", "2026-08-25T09:45:00.000Z"),
        item(2, "company.user-joined", "2026-08-25T09:30:00.000Z"),
      ],
    );

    watch();
    await settlePoll();
    await focusTick();

    expect(useToastStore.getState().toasts).toHaveLength(1);
    expect(useToastStore.getState().toasts[0]?.typeKey).toBe("company.role-assigned");
  });

  it("never announces the same public ID twice across ticks", async () => {
    const arrival = item(2, "company.role-assigned", "2026-08-25T09:30:00.000Z");
    feedReplies("company", [historyItem()], [arrival], [arrival]);

    watch();
    await settlePoll();
    await focusTick();
    await focusTick();

    expect(useToastStore.getState().toasts).toHaveLength(1);
  });

  it("keeps the cursor through a failed tick and announces once it recovers", async () => {
    const net = feedReplies("company", [historyItem()], "offline", [
      item(2, "company.role-assigned", "2026-08-25T09:30:00.000Z"),
    ]);

    watch();
    await settlePoll();
    await focusTick();
    await focusTick();

    expect(sinceOf(net, 2)).toBe("2026-08-25T09:00:00.000Z");
    expect(useToastStore.getState().toasts).toHaveLength(1);
  });

  it("pauses while the tab is hidden and catches up once it returns", async () => {
    const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    const net = feedReplies(
      "company",
      [historyItem()],
      [item(2, "company.role-assigned", "2026-08-25T09:30:00.000Z")],
    );

    watch();
    await focusTick();
    expect(net.count("GET /api/v1/company/notifications")).toBe(0);

    hidden.mockRestore();
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await settlePoll();

    // The catch-up is a fresh sweep: what hid with the tab is history, the next tick announces.
    expect(sinceOf(net, 0)).toBeUndefined();
    expect(useToastStore.getState().toasts).toHaveLength(0);

    await focusTick();

    expect(sinceOf(net, 1)).toBe("2026-08-25T09:00:00.000Z");
    expect(useToastStore.getState().toasts).toHaveLength(1);
  });

  it("does not announce what the panel has already presented", async () => {
    recordPresentedNotifications([
      notificationRow(2, "company.role-assigned", "2026-08-25T09:30:00.000Z"),
    ]);
    const net = feedReplies(
      "company",
      [historyItem()],
      [item(2, "company.role-assigned", "2026-08-25T09:30:00.000Z")],
    );

    watch();
    await settlePoll();
    await focusTick();

    expect(net.count("GET /api/v1/company/notifications")).toBe(2);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });
});
