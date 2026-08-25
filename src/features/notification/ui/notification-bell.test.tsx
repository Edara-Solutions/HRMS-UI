import { readFileSync } from "node:fs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import i18next from "i18next";
import { I18nextProvider } from "react-i18next";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthSession, SessionUser } from "@/shared/auth";
import { useAuthStore } from "@/shared/auth";
import type { NotificationFeedItem } from "../api/notification-feed";
import { useBulkReadCursor } from "../model/notification-read-state";
import { NotificationBell } from "./notification-bell";

const navigateMock = vi.hoisted(() => vi.fn());
const apiGetMock = vi.hoisted(() => vi.fn());
const apiPostMock = vi.hoisted(() => vi.fn());

vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-router")>()),
  useNavigate: () => navigateMock,
}));

// `ky` builds AbortSignals that jsdom's fetch rejects as cross-realm — stub the client boundary
// instead of the network.
vi.mock("@/shared/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api")>()),
  apiClient: { get: apiGetMock, post: apiPostMock },
}));

const testI18n = i18next.createInstance();

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

/**
 * A fixed midday "now": the recency buckets are calendar days, so a suite that reads the real
 * clock puts its rows in different buckets when it runs a few minutes either side of midnight.
 */
const now = new Date("2026-08-25T12:00:00Z");
const hoursAgo = (hours: number) => new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString();

const leadRow: NotificationFeedItem = {
  id: 1,
  scope: "platform",
  typeKey: "platform.lead-created",
  typeVersion: 1,
  importance: "normal",
  params: {},
  actor: { kind: "system" },
  subject: { type: "lead", publicId: "lead-1" },
  createdAt: hoursAgo(1),
  seenAt: null,
  readAt: null,
};

const informationalRow: NotificationFeedItem = {
  ...leadRow,
  id: 2,
  typeKey: "company.user-joined",
  subject: null,
  createdAt: hoursAgo(30),
};

type LifecycleBody = { ids: number[] } | { id?: number; all?: true };

/**
 * A feed the writes actually move, so a reopen sees the rows the previous open marked — the only
 * way to tell "one seen request per open" from "one seen request ever".
 */
function stubEndpoints({ unreadCount = 0, items = [] as NotificationFeedItem[] } = {}) {
  const feed = { unreadCount, items };

  apiGetMock.mockImplementation((path: string) => {
    if (path.endsWith("unread-count")) {
      return Promise.resolve(
        new Response(JSON.stringify({ unreadCount: feed.unreadCount }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    }

    return { json: async () => ({ items: feed.items, nextCursor: null, hasMore: false }) };
  });

  apiPostMock.mockImplementation((_path: string, options: { json: LifecycleBody }) => {
    const body = options.json;

    if ("ids" in body) {
      const marked = new Set(body.ids);
      feed.items = feed.items.map((item) =>
        marked.has(item.id) ? { ...item, seenAt: now.toISOString() } : item,
      );
    }

    feed.unreadCount = 0;
    return Promise.resolve(new Response(null, { status: 204 }));
  });

  return feed;
}

function seenRequests() {
  return apiPostMock.mock.calls.filter(([path]) => path.endsWith("/seen"));
}

function renderBell() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <I18nextProvider i18n={testI18n}>
      <QueryClientProvider client={queryClient}>
        <NotificationBell />
      </QueryClientProvider>
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
    useAuthStore.setState({ session, status: "authenticated" });
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
    vi.clearAllMocks();
    useBulkReadCursor.setState({ cursorAt: null });
    useAuthStore.setState({ session: null, status: "anonymous" });
  });

  it("caps the badge at 99+ and announces the count on the bell", async () => {
    stubEndpoints({ unreadCount: 128 });
    renderBell();

    expect(await screen.findByText("99+")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Notifications, 128 unread" })).toBeInTheDocument();
  });

  it("hides the badge while nothing is unread", async () => {
    stubEndpoints();
    renderBell();

    expect(await screen.findByRole("button", { name: "Notifications" })).toBeInTheDocument();
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("opens the panel on the bell, groups rows by recency, and closes on Escape", async () => {
    stubEndpoints({ items: [leadRow, informationalRow] });
    renderBell();

    const bell = await screen.findByRole("button", { name: "Notifications" });
    expect(bell).toHaveAttribute("aria-haspopup", "dialog");
    expect(bell).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(bell);
    expect(bell).toHaveAttribute("aria-expanded", "true");

    expect(await screen.findByText("New lead registered")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Today" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Yesterday" })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => expect(bell).toHaveAttribute("aria-expanded", "false"));
    expect(bell).toHaveFocus();
  });

  it("navigates from a clickable row and leaves informational rows without an affordance", async () => {
    stubEndpoints({ items: [leadRow, informationalRow] });
    renderBell();

    fireEvent.click(await screen.findByRole("button", { name: "Notifications" }));
    fireEvent.click(await screen.findByRole("button", { name: /New lead registered/ }));

    expect(navigateMock).toHaveBeenCalledWith({ to: "/admin/leads" });
    expect(screen.queryByRole("button", { name: /New member joined/ })).not.toBeInTheDocument();
    expect(screen.getByText("New member joined")).toBeInTheDocument();
  });

  it("shows the empty state when the feed has no rows", async () => {
    stubEndpoints();
    renderBell();

    fireEvent.click(await screen.findByRole("button", { name: "Notifications" }));

    expect(await screen.findByText("You're all caught up")).toBeInTheDocument();
  });

  it("marks the rendered rows seen once per open and drains the badge", async () => {
    stubEndpoints({ unreadCount: 2, items: [leadRow, informationalRow] });
    renderBell();

    fireEvent.click(await screen.findByRole("button", { name: "Notifications, 2 unread" }));
    await screen.findByText("New lead registered");

    await waitFor(() => expect(seenRequests()).toHaveLength(1));
    expect(seenRequests()[0]).toEqual(["company/notifications/seen", { json: { ids: [1, 2] } }]);
    expect(await screen.findByRole("button", { name: "Notifications" })).toBeInTheDocument();
  });

  it("sends no seen request when reopened with nothing left unseen", async () => {
    stubEndpoints({ unreadCount: 2, items: [leadRow, informationalRow] });
    renderBell();

    const bell = await screen.findByRole("button", { name: /Notifications/ });
    fireEvent.click(bell);
    await waitFor(() => expect(seenRequests()).toHaveLength(1));

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(bell).toHaveAttribute("aria-expanded", "false"));
    fireEvent.click(bell);

    await waitFor(() => expect(screen.getByText("New lead registered")).toBeInTheDocument());
    expect(seenRequests()).toHaveLength(1);
  });

  it("marks only the activated row read", async () => {
    stubEndpoints({ unreadCount: 2, items: [leadRow, informationalRow] });
    renderBell();

    fireEvent.click(await screen.findByRole("button", { name: /Notifications/ }));
    fireEvent.click(await screen.findByRole("button", { name: /New lead registered/ }));

    await waitFor(() =>
      expect(apiPostMock).toHaveBeenCalledWith("company/notifications/read", { json: { id: 1 } }),
    );
    expect(navigateMock).toHaveBeenCalledWith({ to: "/admin/leads" });
  });

  it("advances the bulk-read cursor from the panel header and mutes the rows", async () => {
    stubEndpoints({ unreadCount: 2, items: [leadRow, informationalRow] });
    renderBell();

    fireEvent.click(await screen.findByRole("button", { name: /Notifications/ }));
    await screen.findByText("New lead registered");
    fireEvent.click(screen.getByRole("button", { name: "Mark all read" }));

    await waitFor(() =>
      expect(apiPostMock).toHaveBeenCalledWith("company/notifications/read", {
        json: { all: true },
      }),
    );
    expect(useBulkReadCursor.getState().cursorAt).not.toBeNull();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Mark all read" })).toBeDisabled(),
    );
  });

  it("cycles Tab inside the open panel", async () => {
    stubEndpoints({ unreadCount: 2, items: [leadRow, informationalRow] });
    renderBell();

    fireEvent.click(await screen.findByRole("button", { name: /Notifications/ }));

    const markAll = await screen.findByRole("button", { name: "Mark all read" });
    const row = await screen.findByRole("button", { name: /New lead registered/ });

    row.focus();
    fireEvent.keyDown(document, { key: "Tab" });

    expect(markAll).toHaveFocus();
  });

  it("rolls the badge back and surfaces the failure when marking seen fails", async () => {
    stubEndpoints({ unreadCount: 2, items: [leadRow, informationalRow] });
    apiPostMock.mockRejectedValue(new Error("network down"));
    renderBell();

    fireEvent.click(await screen.findByRole("button", { name: /Notifications/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent("That didn't go through.");
    expect(screen.getByRole("button", { name: "Notifications, 2 unread" })).toBeInTheDocument();
  });
});
