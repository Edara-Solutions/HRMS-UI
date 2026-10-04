import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import i18next from "i18next";
import { I18nextProvider } from "react-i18next";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { AudienceSessionProvider, usePlatformSession as useAuthStore } from "@/shared/auth";
import { platformSessionFixture } from "../../../test/audience-fixtures";
import { operationNetwork } from "../../../test/operation-request-mock";
import { NotificationBell } from "./notification-bell";

vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-router")>()),
  useNavigate: () => vi.fn(),
}));

const testI18n = i18next.createInstance();

const session = platformSessionFixture();

function stubCount(unreadCount: number) {
  const net = operationNetwork.install();
  net.on("GET /api/v1/platform/notifications/unread-count", () => ({
    status: 200,
    body: { unreadCount },
  }));
  return net;
}

function renderBell() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <I18nextProvider i18n={testI18n}>
      <AudienceSessionProvider audience="platform">
        <QueryClientProvider client={queryClient}>
          <NotificationBell />
        </QueryClientProvider>
      </AudienceSessionProvider>
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
  useAuthStore.getState().clearSession();
});

describe("the badge a Platform Admin sees", () => {
  it("counts the platform mount, not the company one", async () => {
    useAuthStore.getState().setSession(session);
    const net = stubCount(1);
    renderBell();

    expect(await screen.findByText("1")).toBeInTheDocument();
    expect(net.calls.map((call) => [call.audience, call.key])).toEqual([
      ["platform", "GET /api/v1/platform/notifications/unread-count"],
    ]);
  });
});
