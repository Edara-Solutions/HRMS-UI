import { readFileSync } from "node:fs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import i18next from "i18next";
import { I18nextProvider } from "react-i18next";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthSession, SessionUser } from "@/shared/auth";
import { useAuthStore } from "@/shared/auth";
import { type NotificationListStyle, usePreferencesStore } from "@/shared/config";
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

const unreadRow: NotificationFeedItem = {
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

/** Already read, so it is the row the Unread chip has to hide. */
const readRow: NotificationFeedItem = {
  ...unreadRow,
  id: 2,
  typeKey: "company.user-joined",
  subject: null,
  createdAt: hoursAgo(30),
  seenAt: hoursAgo(29),
  readAt: hoursAgo(29),
};

function stubEndpoints({ unreadCount = 0, items = [] as NotificationFeedItem[] } = {}) {
  apiGetMock.mockImplementation((path: string) => {
    if (path.endsWith("unread-count")) {
      return Promise.resolve(
        new Response(JSON.stringify({ unreadCount }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    }

    return { json: async () => ({ items, nextCursor: null, hasMore: false }) };
  });

  apiPostMock.mockResolvedValue(new Response(null, { status: 204 }));
}

function renderBell(listStyle: NotificationListStyle) {
  usePreferencesStore.setState({ notificationListStyle: listStyle });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <I18nextProvider i18n={testI18n}>
      <QueryClientProvider client={queryClient}>
        <NotificationBell />
      </QueryClientProvider>
    </I18nextProvider>,
  );
}

async function openCenter(listStyle: NotificationListStyle) {
  renderBell(listStyle);
  const bell = await screen.findByRole("button", { name: /Notifications/ });
  fireEvent.click(bell);
  return bell;
}

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
  useAuthStore.setState({ session, status: "authenticated" });
});

afterEach(() => {
  vi.useRealTimers();
  cleanup();
  vi.clearAllMocks();
  useBulkReadCursor.setState({ cursorAt: null });
  useAuthStore.setState({ session: null, status: "anonymous" });
  usePreferencesStore.setState({ notificationListStyle: "panel" });
  localStorage.removeItem("hrms-prefs");
});

describe("notification list shapes", () => {
  it("opens the sheet, holds the page still behind it, and lets it go on Escape", async () => {
    stubEndpoints({ items: [unreadRow] });
    const bell = await openCenter("sheet");

    const sheet = await screen.findByRole("dialog", { name: "Notifications" });
    expect(sheet).toHaveAttribute("aria-modal", "true");
    expect(await screen.findByText("New lead registered")).toBeInTheDocument();
    expect(document.body.style.overflow).toBe("hidden");

    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => expect(document.body.style.overflow).toBe(""));
    expect(bell).toHaveFocus();
  });

  it("keeps the sheet's day headings and closes it from its own close control", async () => {
    stubEndpoints({ items: [unreadRow, readRow] });
    await openCenter("sheet");

    expect(await screen.findByRole("heading", { name: "Today" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Yesterday" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close notifications" }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Notifications/ })).toHaveAttribute(
        "aria-expanded",
        "false",
      ),
    );
  });

  it("reads one row from its own control without opening it", async () => {
    stubEndpoints({ unreadCount: 1, items: [unreadRow] });
    await openCenter("sheet");
    await screen.findByText("New lead registered");

    fireEvent.click(screen.getByRole("button", { name: "Mark as read" }));

    await waitFor(() =>
      expect(apiPostMock).toHaveBeenCalledWith("company/notifications/read", { json: { id: 1 } }),
    );
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("gives a row with nowhere to navigate its own read path, reachable by keyboard", async () => {
    stubEndpoints({ items: [{ ...readRow, readAt: null, seenAt: hoursAgo(29) }] });
    await openCenter("sheet");
    await screen.findByText("New member joined");

    const markRead = screen.getByRole("button", { name: "Mark as read" });
    markRead.focus();
    expect(markRead).toHaveFocus();
    fireEvent.click(markRead);

    await waitFor(() =>
      expect(apiPostMock).toHaveBeenCalledWith("company/notifications/read", { json: { id: 2 } }),
    );
  });

  it("filters the compact list to unread rows without touching the badge", async () => {
    stubEndpoints({ unreadCount: 1, items: [unreadRow, readRow] });
    await openCenter("flat");

    expect(await screen.findByText("New lead registered")).toBeInTheDocument();
    expect(screen.getByText("New member joined")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Today" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: "Unread" }));

    expect(screen.queryByText("New member joined")).not.toBeInTheDocument();
    expect(screen.getByText("New lead registered")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Unread" })).toHaveAttribute("aria-checked", "true");
    expect(await screen.findByRole("button", { name: "Notifications, 1 unread" })).toBeVisible();
  });

  it("marks everything read from the compact list's icon control", async () => {
    stubEndpoints({ unreadCount: 1, items: [unreadRow] });
    await openCenter("flat");
    await screen.findByText("New lead registered");

    fireEvent.click(screen.getByRole("button", { name: "Mark all read" }));

    await waitFor(() =>
      expect(apiPostMock).toHaveBeenCalledWith("company/notifications/read", {
        json: { all: true },
      }),
    );
  });
});

describe("notification style picker", () => {
  it("swaps the open shape for the new one the moment the reader picks it, and keeps the choice", async () => {
    stubEndpoints({ items: [unreadRow] });
    await openCenter("panel");
    await screen.findByText("New lead registered");

    fireEvent.click(screen.getByRole("button", { name: "Notification settings" }));

    const options = screen.getByRole("radiogroup", { name: "List style" });
    expect(within(options).getByRole("radio", { name: /Panel/ })).toHaveAttribute(
      "aria-checked",
      "true",
    );

    fireEvent.click(within(options).getByRole("radio", { name: /Sheet/ }));

    expect(usePreferencesStore.getState().notificationListStyle).toBe("sheet");
    // The picker rides along into the new shape, so the next option is one click away.
    expect(await screen.findByRole("dialog", { name: "Notifications" })).toHaveAttribute(
      "aria-modal",
      "true",
    );
    expect(screen.getByRole("radiogroup", { name: "List style" })).toBeInTheDocument();

    await usePreferencesStore.persist.rehydrate();
    expect(JSON.parse(localStorage.getItem("hrms-prefs") ?? "{}").state).toMatchObject({
      notificationListStyle: "sheet",
    });
  });

  it("moves focus with the arrow keys and waits to be told before changing the style", async () => {
    stubEndpoints({ items: [unreadRow] });
    await openCenter("panel");

    fireEvent.click(screen.getByRole("button", { name: "Notification settings" }));
    const options = screen.getByRole("radiogroup", { name: "List style" });
    fireEvent.keyDown(options, { key: "ArrowDown" });

    const sheetOption = within(options).getByRole("radio", { name: /Sheet/ });
    expect(sheetOption).toHaveFocus();
    expect(sheetOption).toHaveAttribute("aria-checked", "false");
    expect(usePreferencesStore.getState().notificationListStyle).toBe("panel");

    fireEvent.click(sheetOption);

    expect(usePreferencesStore.getState().notificationListStyle).toBe("sheet");
  });

  it("returns to the feed from the picker's back control", async () => {
    stubEndpoints({ items: [unreadRow] });
    await openCenter("flat");
    await screen.findByText("New lead registered");

    fireEvent.click(screen.getByRole("button", { name: "Notification settings" }));
    expect(screen.queryByText("New lead registered")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Back to notifications" }));

    expect(await screen.findByText("New lead registered")).toBeInTheDocument();
    expect(screen.queryByRole("radiogroup", { name: "List style" })).not.toBeInTheDocument();
  });
});
