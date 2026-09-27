import { readFileSync } from "node:fs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import i18next from "i18next";
import { I18nextProvider } from "react-i18next";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { AudienceSessionProvider, useCompanySession } from "@/shared/auth";
import { companySessionFixture } from "../../../test/audience-fixtures";
import { notificationId, notificationItem } from "../../../test/notification-fixtures";
import { operationNetwork } from "../../../test/operation-request-mock";
import { useBulkReadCursor } from "../model/notification-read-state";
import { NotificationBell } from "./notification-bell";

const navigateMock = vi.hoisted(() => vi.fn());

vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-router")>()),
  useNavigate: () => navigateMock,
}));

const testI18n = i18next.createInstance();

const session = companySessionFixture();
const scopeKey = `company:${session.user.publicId}`;

/**
 * A fixed midday "now": the recency buckets are calendar days, so a suite that reads the real
 * clock puts its rows in different buckets when it runs a few minutes either side of midnight.
 */
const now = new Date("2026-08-25T12:00:00Z");
const hoursAgo = (hours: number) => new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString();

const subscriptionRow = notificationItem(1, hoursAgo(1), {
  typeKey: "company.subscription-changed",
  importance: "high",
  params: { planName: "Growth", status: "active" },
});
const informationalRow = notificationItem(2, hoursAgo(30), { typeKey: "company.user-joined" });
const unknownRow = notificationItem(3, hoursAgo(2), {
  typeKey: "company.future-type",
  params: {},
});

const seenKey = "POST /api/v1/company/notifications/seen";
const readKey = "POST /api/v1/company/notifications/read";

/**
 * A feed the writes actually move, so a reopen sees the rows the previous open marked — the only
 * way to tell "one seen request per open" from "one seen request ever".
 */
function stubEndpoints({ unreadCount = 0, items = [] as unknown[], failWrites = false } = {}) {
  const feed = { unreadCount, items: [...items] };
  const net = operationNetwork.install();

  net.on("GET /api/v1/company/notifications/unread-count", () => ({
    status: 200,
    body: { unreadCount: feed.unreadCount },
  }));
  net.on("GET /api/v1/company/notifications", () => ({
    status: 200,
    body: { items: feed.items, nextCursor: null, hasMore: false },
  }));
  net.on(seenKey, (input) => {
    if (failWrites) throw new TypeError("Failed to fetch");
    const marked = new Set((input as { body: { publicIds: string[] } }).body.publicIds);
    feed.items = feed.items.map((item) =>
      typeof item === "object" &&
      item !== null &&
      "publicId" in item &&
      marked.has(String(item.publicId))
        ? { ...item, seenAt: now.toISOString() }
        : item,
    );
    feed.unreadCount = 0;
    return { status: 200, body: { seenCount: marked.size } };
  });
  net.on(readKey, () => {
    if (failWrites) throw new TypeError("Failed to fetch");
    feed.unreadCount = 0;
    return { status: 204 };
  });

  return net;
}

function renderBell() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <I18nextProvider i18n={testI18n}>
      <AudienceSessionProvider audience="company">
        <QueryClientProvider client={queryClient}>
          <NotificationBell />
        </QueryClientProvider>
      </AudienceSessionProvider>
    </I18nextProvider>,
  );
}

describe("NotificationBell", () => {
  beforeAll(async () => {
    await testI18n.init({
      lng: "en",
      fallbackLng: "en",
      ns: ["notification"],
      defaultNS: "notification",
      keySeparator: false,
      interpolation: { escapeValue: false },
      resources: {
        en: {
          notification: JSON.parse(readFileSync("public/locales/en/notification.json", "utf8")),
        },
      },
    });
  });

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"], now, shouldAdvanceTime: true });
    useCompanySession.getState().setSession(session);
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
    navigateMock.mockReset();
    useBulkReadCursor.setState({ cursors: {} });
    useCompanySession.getState().clearSession();
  });

  it("caps the badge at 99+ and announces the declared count on the bell", async () => {
    stubEndpoints({ unreadCount: 128 });
    renderBell();

    expect(await screen.findByText("99+")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Notifications, 128 unread" })).toBeInTheDocument();
  });

  it("takes the badge from the count read even when the feed holds unread rows", async () => {
    const net = stubEndpoints({ unreadCount: 0, items: [subscriptionRow] });
    renderBell();

    expect(await screen.findByRole("button", { name: "Notifications" })).toBeInTheDocument();
    expect(screen.queryByText("1")).not.toBeInTheDocument();
    expect(net.count("GET /api/v1/company/notifications")).toBe(0);
  });

  it("opens the panel on the bell, groups rows by recency, and closes on Escape", async () => {
    stubEndpoints({ items: [subscriptionRow, informationalRow] });
    renderBell();

    const bell = await screen.findByRole("button", { name: "Notifications" });
    expect(bell).toHaveAttribute("aria-haspopup", "dialog");
    expect(bell).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(bell);
    expect(bell).toHaveAttribute("aria-expanded", "true");

    expect(await screen.findByText("Subscription updated")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Today" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Yesterday" })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => expect(bell).toHaveAttribute("aria-expanded", "false"));
    expect(bell).toHaveFocus();
  });

  it("navigates from a clickable row and leaves informational and unknown rows inert", async () => {
    stubEndpoints({ items: [subscriptionRow, unknownRow, informationalRow] });
    renderBell();

    fireEvent.click(await screen.findByRole("button", { name: "Notifications" }));
    fireEvent.click(await screen.findByRole("button", { name: /Subscription updated/ }));

    expect(navigateMock).toHaveBeenCalledWith({ href: "/company/dashboard" });
    expect(screen.queryByRole("button", { name: /New member joined/ })).not.toBeInTheDocument();
    expect(screen.getByText("New notification")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /New notification/ })).not.toBeInTheDocument();
    expect(document.body.textContent).not.toContain("company.future-type");
  });

  it("shows the empty state when the feed has no rows", async () => {
    stubEndpoints();
    renderBell();

    fireEvent.click(await screen.findByRole("button", { name: "Notifications" }));

    expect(await screen.findByText("You're all caught up")).toBeInTheDocument();
  });

  it("marks the rendered rows seen once per open by public ID", async () => {
    const net = stubEndpoints({ unreadCount: 2, items: [subscriptionRow, informationalRow] });
    renderBell();

    fireEvent.click(await screen.findByRole("button", { name: "Notifications, 2 unread" }));
    await screen.findByText("Subscription updated");

    await waitFor(() => expect(net.count(seenKey)).toBe(1));
    expect(net.calls.find((call) => call.key === seenKey)?.input).toEqual({
      body: { publicIds: [notificationId(1), notificationId(2)] },
    });
    expect(await screen.findByRole("button", { name: "Notifications" })).toBeInTheDocument();
  });

  it("sends no seen request when reopened with nothing left unseen", async () => {
    const net = stubEndpoints({ unreadCount: 2, items: [subscriptionRow, informationalRow] });
    renderBell();

    const bell = await screen.findByRole("button", { name: /Notifications/ });
    fireEvent.click(bell);
    await waitFor(() => expect(net.count(seenKey)).toBe(1));

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(bell).toHaveAttribute("aria-expanded", "false"));
    fireEvent.click(bell);

    await waitFor(() => expect(screen.getByText("Subscription updated")).toBeInTheDocument());
    expect(net.count(seenKey)).toBe(1);
  });

  it("marks only the activated row read", async () => {
    const net = stubEndpoints({ unreadCount: 2, items: [subscriptionRow, informationalRow] });
    renderBell();

    fireEvent.click(await screen.findByRole("button", { name: /Notifications/ }));
    fireEvent.click(await screen.findByRole("button", { name: /Subscription updated/ }));

    await waitFor(() =>
      expect(net.calls.find((call) => call.key === readKey)?.input).toEqual({
        body: { publicId: notificationId(1) },
      }),
    );
    expect(navigateMock).toHaveBeenCalledWith({ href: "/company/dashboard" });
  });

  it("advances this identity's bulk-read cursor from the panel header and mutes the rows", async () => {
    const net = stubEndpoints({ unreadCount: 2, items: [subscriptionRow, informationalRow] });
    renderBell();

    fireEvent.click(await screen.findByRole("button", { name: /Notifications/ }));
    await screen.findByText("Subscription updated");
    fireEvent.click(screen.getByRole("button", { name: "Mark all read" }));

    await waitFor(() =>
      expect(
        net.calls.some(
          (call) => call.key === readKey && JSON.stringify(call.input).includes('"all":true'),
        ),
      ).toBe(true),
    );
    expect(useBulkReadCursor.getState().cursors[scopeKey]).toBeDefined();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Mark all read" })).toBeDisabled(),
    );
  });

  it("cycles Tab inside the open panel", async () => {
    stubEndpoints({ unreadCount: 2, items: [subscriptionRow, informationalRow] });
    renderBell();

    fireEvent.click(await screen.findByRole("button", { name: /Notifications/ }));

    const markAll = await screen.findByRole("button", { name: "Mark all read" });
    const row = await screen.findByRole("button", { name: /Subscription updated/ });

    row.focus();
    fireEvent.keyDown(document, { key: "Tab" });

    expect(markAll).toHaveFocus();
  });

  it("rolls the badge back and surfaces the failure when marking seen fails", async () => {
    stubEndpoints({ unreadCount: 2, items: [subscriptionRow, informationalRow], failWrites: true });
    renderBell();

    fireEvent.click(await screen.findByRole("button", { name: /Notifications/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent("That didn't go through.");
    expect(screen.getByRole("button", { name: "Notifications, 2 unread" })).toBeInTheDocument();
  });
});
