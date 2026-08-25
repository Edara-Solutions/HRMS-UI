import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import i18next from "i18next";
import { I18nextProvider } from "react-i18next";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { AuthSession, SessionUser } from "@/shared/auth";
import { useAuthStore } from "@/shared/auth";
import { NotificationBell } from "./notification-bell";

const apiGetMock = vi.hoisted(() => vi.fn());

vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-router")>()),
  useNavigate: () => vi.fn(),
}));

vi.mock("@/shared/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api")>()),
  apiClient: { get: apiGetMock, post: vi.fn() },
}));

const testI18n = i18next.createInstance();

const platformAdmin: SessionUser = {
  publicId: "admin-1",
  employeeCode: "ADM-001",
  firstName: "Amina",
  lastName: "Saleh",
  email: "amina@edara.test",
  status: "ACTIVE",
  companyCode: "EDARA",
  mustChangePassword: false,
  permissions: [],
  isOwner: false,
  isPlatformAdmin: true,
};

const session: AuthSession = {
  accessToken: "access-token",
  refreshToken: "refresh-token",
  sessionId: "session-1",
  expiresIn: 900,
  user: platformAdmin,
};

function stubCount(unreadCount: number) {
  apiGetMock.mockImplementation((path: string) => {
    if (path.endsWith("unread-count")) {
      return Promise.resolve(
        new Response(JSON.stringify({ unreadCount }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    }

    return { json: async () => ({ items: [], nextCursor: null, hasMore: false }) };
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

beforeAll(async () => {
  await testI18n.init({
    lng: "en",
    fallbackLng: "en",
    ns: ["notification"],
    defaultNS: "notification",
    keySeparator: false,
    interpolation: { escapeValue: false },
    resources: { en: { notification: { "panel.title": "Notifications" } } },
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  useAuthStore.setState({ session: null, status: "anonymous" });
});

describe("the badge a Platform Admin sees", () => {
  it("counts the platform mount, not the company one", async () => {
    useAuthStore.setState({ session, status: "authenticated" });
    stubCount(1);
    renderBell();

    expect(await screen.findByText("1")).toBeInTheDocument();
    expect(apiGetMock).toHaveBeenCalledWith("platform/notifications/unread-count", {
      headers: undefined,
    });
  });
});
