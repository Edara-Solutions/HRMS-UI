import { readFileSync } from "node:fs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import i18next from "i18next";
import { I18nextProvider } from "react-i18next";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { AudienceSessionProvider, useCompanySession } from "@/shared/auth";
import { type NotificationListStyle, usePreferencesStore } from "@/shared/config";
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

/**
 * A fixed midday "now": the recency buckets are calendar days, so a suite that reads the real
 * clock puts its rows in different buckets when it runs a few minutes either side of midnight.
 */
const now = new Date("2026-08-25T12:00:00Z");
const hoursAgo = (hours: number) => new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString();

const unreadRow = notificationItem(1, hoursAgo(1), {
  typeKey: "company.subscription-changed",
  params: { planName: "Growth", status: "active" },
});

/** Already read, so it is the row the Unread chip has to hide. */
const readRow = notificationItem(2, hoursAgo(30), {
  typeKey: "company.user-joined",
  seenAt: hoursAgo(29),
  readAt: hoursAgo(29),
});

const readKey = "POST /api/v1/company/notifications/read";

function stubEndpoints({ unreadCount = 0, items = [] as unknown[] } = {}) {
  const net = operationNetwork.install();
  net.on("GET /api/v1/company/notifications/unread-count", () => ({
    status: 200,
    body: { unreadCount },
  }));
  net.on("GET /api/v1/company/notifications", () => ({
    status: 200,
    body: { items, nextCursor: null, hasMore: false },
  }));
  net.on("POST /api/v1/company/notifications/seen", () => ({
    status: 200,
    body: { seenCount: 0 },
  }));
  net.on(readKey, () => ({ status: 204 }));
  return net;
}

function readInputs() {
  return operationNetwork.current.calls
    .filter((call) => call.key === readKey)
    .map((call) => call.input);
}

function renderBell(listStyle: NotificationListStyle) {
  usePreferencesStore
    .getState()
    .setPresentation(`company:${session.user.publicId}`, { notificationListStyle: listStyle });
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
  useCompanySession.getState().setSession(session);
});

afterEach(() => {
  vi.useRealTimers();
  cleanup();
  navigateMock.mockReset();
  useBulkReadCursor.setState({ cursors: {} });
  useCompanySession.getState().clearSession();
  usePreferencesStore.setState({ scopes: {} });
  localStorage.removeItem("hrms-prefs");
});

describe("notification list shapes", () => {
  it("opens the sheet, holds the page still behind it, and lets it go on Escape", async () => {
    stubEndpoints({ items: [unreadRow] });
    const bell = await openCenter("sheet");

    const sheet = await screen.findByRole("dialog", { name: "Notifications" });
    expect(sheet).toHaveAttribute("aria-modal", "true");
    expect(await screen.findByText("Subscription updated")).toBeInTheDocument();
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
    await screen.findByText("Subscription updated");

    fireEvent.click(screen.getByRole("button", { name: "Mark as read" }));

    await waitFor(() => expect(readInputs()).toEqual([{ body: { publicId: notificationId(1) } }]));
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

    await waitFor(() => expect(readInputs()).toEqual([{ body: { publicId: notificationId(2) } }]));
  });

  it("filters the compact list to unread rows without touching the badge", async () => {
    stubEndpoints({ unreadCount: 1, items: [unreadRow, readRow] });
    await openCenter("flat");

    expect(await screen.findByText("Subscription updated")).toBeInTheDocument();
    expect(screen.getByText("New member joined")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Today" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: "Unread" }));

    expect(screen.queryByText("New member joined")).not.toBeInTheDocument();
    expect(screen.getByText("Subscription updated")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Unread" })).toHaveAttribute("aria-checked", "true");
    expect(await screen.findByRole("button", { name: "Notifications, 1 unread" })).toBeVisible();
  });

  it("marks everything read from the compact list's icon control", async () => {
    stubEndpoints({ unreadCount: 1, items: [unreadRow] });
    await openCenter("flat");
    await screen.findByText("Subscription updated");

    fireEvent.click(screen.getByRole("button", { name: "Mark all read" }));

    await waitFor(() => expect(readInputs()).toEqual([{ body: { all: true } }]));
  });
});

describe("notification style picker", () => {
  it("swaps the open shape for the new one the moment the reader picks it, and keeps the choice", async () => {
    stubEndpoints({ items: [unreadRow] });
    await openCenter("panel");
    await screen.findByText("Subscription updated");

    fireEvent.click(screen.getByRole("button", { name: "Notification settings" }));

    const options = screen.getByRole("radiogroup", { name: "List style" });
    expect(within(options).getByRole("radio", { name: /Panel/ })).toHaveAttribute(
      "aria-checked",
      "true",
    );

    fireEvent.click(within(options).getByRole("radio", { name: /Sheet/ }));

    expect(
      usePreferencesStore.getState().scopes[`company:${session.user.publicId}`]
        ?.notificationListStyle,
    ).toBe("sheet");
    // The picker rides along into the new shape, so the next option is one click away.
    expect(await screen.findByRole("dialog", { name: "Notifications" })).toHaveAttribute(
      "aria-modal",
      "true",
    );
    expect(screen.getByRole("radiogroup", { name: "List style" })).toBeInTheDocument();

    await usePreferencesStore.persist.rehydrate();
    expect(
      JSON.parse(localStorage.getItem("hrms-preferences:v2") ?? "{}").state.scopes[
        `company:${session.user.publicId}`
      ],
    ).toMatchObject({
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
    expect(
      usePreferencesStore.getState().scopes[`company:${session.user.publicId}`]
        ?.notificationListStyle,
    ).toBe("panel");

    fireEvent.click(sheetOption);

    expect(
      usePreferencesStore.getState().scopes[`company:${session.user.publicId}`]
        ?.notificationListStyle,
    ).toBe("sheet");
  });

  it("returns to the feed from the picker's back control", async () => {
    stubEndpoints({ items: [unreadRow] });
    await openCenter("flat");
    await screen.findByText("Subscription updated");

    fireEvent.click(screen.getByRole("button", { name: "Notification settings" }));
    expect(screen.queryByText("Subscription updated")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Back to notifications" }));

    expect(await screen.findByText("Subscription updated")).toBeInTheDocument();
    expect(screen.queryByRole("radiogroup", { name: "List style" })).not.toBeInTheDocument();
  });
});
