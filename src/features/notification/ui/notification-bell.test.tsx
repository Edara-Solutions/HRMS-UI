import { readFileSync } from "node:fs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import i18next from "i18next";
import { I18nextProvider } from "react-i18next";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthSession, SessionUser } from "@/shared/auth";
import { useAuthStore } from "@/shared/auth";
import { NotificationBell } from "./notification-bell";

const navigateMock = vi.hoisted(() => vi.fn());
const apiGetMock = vi.hoisted(() => vi.fn());

vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-router")>()),
  useNavigate: () => navigateMock,
}));

// `ky` builds AbortSignals that jsdom's fetch rejects as cross-realm — stub the client boundary
// instead of the network.
vi.mock("@/shared/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api")>()),
  apiClient: { get: apiGetMock },
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

const now = new Date();
const hoursAgo = (hours: number) => new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString();

const leadRow = {
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

const informationalRow = {
  ...leadRow,
  id: 2,
  typeKey: "company.user-joined",
  subject: null,
  createdAt: hoursAgo(30),
};

function stubEndpoints({ unreadCount = 0, items = [] as unknown[] } = {}) {
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
    useAuthStore.setState({ session, status: "authenticated" });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
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
});
