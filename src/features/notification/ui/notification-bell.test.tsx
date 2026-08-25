import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AuthSession, SessionUser } from "@/shared/auth";
import { useAuthStore } from "@/shared/auth";
import { NotificationBell } from "./notification-bell";

const unreadCountGetMock = vi.hoisted(() => vi.fn());

// `ky` builds AbortSignals that jsdom's fetch rejects as cross-realm — stub the client
// boundary instead of the network.
vi.mock("@/shared/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api")>()),
  apiClient: { get: unreadCountGetMock },
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

function renderBell(unreadCount: number) {
  unreadCountGetMock.mockResolvedValue(
    new Response(JSON.stringify({ unreadCount }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  );
  useAuthStore.setState({ session, status: "authenticated" });

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={queryClient}>
      <NotificationBell />
    </QueryClientProvider>,
  );
}

describe("NotificationBell", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    useAuthStore.setState({ session: null, status: "anonymous" });
  });

  it("caps the badge at 99+ and announces the count on the bell", async () => {
    renderBell(128);

    expect(await screen.findByText("99+")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Notifications, 128 unread" })).toBeInTheDocument();
  });

  it("hides the badge while nothing is unread", async () => {
    renderBell(0);

    expect(await screen.findByRole("button", { name: "Notifications" })).toBeInTheDocument();
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });
});
