import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/shared/auth";
import { AcceptInvitationPage } from "./accept-invitation-page";

const navigateMock = vi.hoisted(() => vi.fn());
const searchMock = vi.hoisted(() => vi.fn(() => ({ token: "invite-token" })));
const acceptPostMock = vi.hoisted(() => vi.fn());
const meGetMock = vi.hoisted(() => vi.fn());

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useSearch: () => searchMock(),
  };
});

vi.mock("@/shared/api/client", () => ({
  apiClient: {
    post: acceptPostMock,
    get: meGetMock,
  },
}));

function jsonResponse<T>(value: T) {
  return { json: () => Promise.resolve(value) };
}

async function rejectedWith(status: number, body: unknown) {
  const { HTTPError } = await import("ky");
  return {
    json: () =>
      Promise.reject(
        new HTTPError(
          new Response(JSON.stringify(body), { status }),
          new Request("http://localhost/auth/accept-invitation"),
          { credentials: "same-origin" } as never,
        ),
      ),
  };
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AcceptInvitationPage />
    </QueryClientProvider>,
  );
}

const tokens = {
  accessToken: "access-token",
  refreshToken: "refresh-token",
  sessionId: "session-1",
  expiresIn: 900,
};

const ownerMeResponse = {
  publicId: "owner-1",
  employeeCode: "OWN-001",
  firstName: "Sara",
  lastName: "Owner",
  email: "owner@edara.com",
  status: "ACTIVE" as const,
  companyCode: "ACME",
  mustChangePassword: false,
  permissions: [],
  isOwner: true,
  isPlatformAdmin: false,
};

async function submitPassword(password = "StrongPassword123!") {
  fireEvent.change(screen.getByLabelText(/^new password$/i), { target: { value: password } });
  fireEvent.change(screen.getByLabelText(/confirm new password/i), { target: { value: password } });
  fireEvent.click(screen.getByRole("button", { name: /accept invitation/i }));
}

describe("AcceptInvitationPage", () => {
  afterEach(() => {
    cleanup();
    navigateMock.mockClear();
    searchMock.mockReset();
    searchMock.mockReturnValue({ token: "invite-token" });
    acceptPostMock.mockReset();
    meGetMock.mockReset();
    useAuthStore.setState({ session: null, status: "anonymous" });
  });

  it("accepts a valid invitation, hydrates /auth/me, and enters tenant context", async () => {
    acceptPostMock.mockReturnValue(jsonResponse(tokens));
    meGetMock.mockReturnValue(jsonResponse(ownerMeResponse));

    renderPage();
    await submitPassword();

    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith({ to: "/company/dashboard" }));
    expect(acceptPostMock).toHaveBeenCalledWith(
      "auth/accept-invitation",
      expect.objectContaining({
        json: {
          token: "invite-token",
          newPassword: "StrongPassword123!",
          clientType: "web",
        },
      }),
    );
    expect(meGetMock).toHaveBeenCalledWith(
      "auth/me",
      expect.objectContaining({ headers: { Authorization: "Bearer access-token" } }),
    );
    expect(useAuthStore.getState().session?.user.isOwner).toBe(true);
  });

  it("gives safe recovery guidance for invalid or expired invitation tokens", async () => {
    acceptPostMock.mockReturnValue(
      await rejectedWith(409, { error: "Invitation token already used" }),
    );

    renderPage();
    await submitPassword();

    expect(
      await screen.findByText(
        /this invitation link is invalid, expired, already used, or revoked/i,
      ),
    ).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
