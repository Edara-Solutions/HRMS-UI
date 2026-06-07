import { useAuthStore } from "@/auth/store";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminLoginPage } from "./admin-login.page";

const navigateMock = vi.hoisted(() => vi.fn());
const adminLoginPostMock = vi.hoisted(() => vi.fn());
const meGetMock = vi.hoisted(() => vi.fn());

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    useNavigate: () => navigateMock,
    Link: ({ children, ...props }: { children: React.ReactNode }) => <a {...props}>{children}</a>,
  };
});

// `ky` (the apiClient's HTTP layer) constructs AbortSignals that jsdom's fetch
// rejects as cross-realm — stub the client boundary instead of the network.
vi.mock("@/api/client", () => ({
  apiClient: {
    post: adminLoginPostMock,
    get: meGetMock,
  },
}));

function jsonResponse<T>(value: T) {
  return { json: () => Promise.resolve(value) };
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AdminLoginPage />
    </QueryClientProvider>,
  );
}

const tokens = {
  accessToken: "access-token",
  refreshToken: "refresh-token",
  sessionId: "session-1",
  expiresIn: 900,
};

const baseMeResponse = {
  publicId: "operator-1",
  employeeCode: "ADM-001",
  firstName: "Mona",
  lastName: "Nasser",
  email: "operator@edara.com",
  status: "ACTIVE" as const,
  companyCode: "EDARA",
  mustChangePassword: false,
  permissions: [],
  isOwner: false,
  isPlatformAdmin: true,
};

async function fillAndSubmit(email: string, password: string) {
  fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: email } });
  fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: password } });
  fireEvent.click(screen.getByRole("button", { name: /sign in to admin/i }));
}

describe("AdminLoginPage", () => {
  afterEach(() => {
    cleanup();
    navigateMock.mockClear();
    adminLoginPostMock.mockReset();
    meGetMock.mockReset();
    useAuthStore.setState({ session: null, status: "anonymous" });
  });

  it("shows validation errors for empty fields without calling the API", async () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: /sign in to admin/i }));

    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
    expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    expect(adminLoginPostMock).not.toHaveBeenCalled();
  });

  it("logs in, hydrates from /auth/me, and redirects to the operator dashboard for a platform admin", async () => {
    adminLoginPostMock.mockReturnValue(jsonResponse(tokens));
    meGetMock.mockReturnValue(jsonResponse(baseMeResponse));

    renderPage();
    await fillAndSubmit("operator@edara.com", "S3curePass!");

    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith({ to: "/admin/dashboard" }));

    expect(adminLoginPostMock).toHaveBeenCalledWith(
      "auth/admin/login",
      expect.objectContaining({
        json: { email: "operator@edara.com", password: "S3curePass!", clientType: "web" },
      }),
    );
    expect(useAuthStore.getState().session?.user.isPlatformAdmin).toBe(true);
  });

  it("redirects by the isPlatformAdmin flag, not by which form was used — bounces a non-operator", async () => {
    adminLoginPostMock.mockReturnValue(jsonResponse(tokens));
    meGetMock.mockReturnValue(jsonResponse({ ...baseMeResponse, isPlatformAdmin: false }));

    renderPage();
    await fillAndSubmit("notanoperator@edara.com", "S3curePass!");

    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith({ to: "/company/dashboard" }));
  });

  it("sends a must-change-password user to the forced-change route", async () => {
    adminLoginPostMock.mockReturnValue(jsonResponse(tokens));
    meGetMock.mockReturnValue(jsonResponse({ ...baseMeResponse, mustChangePassword: true }));

    renderPage();
    await fillAndSubmit("operator@edara.com", "S3curePass!");

    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith({ to: "/change-password" }));
  });

  it("shows a generic error for invalid credentials (indistinguishable wrong-email vs wrong-password)", async () => {
    const { HTTPError } = await import("ky");
    adminLoginPostMock.mockReturnValue({
      json: () =>
        Promise.reject(
          new HTTPError(
            new Response(null, { status: 422 }),
            new Request("http://localhost/auth/admin/login"),
            { credentials: "same-origin" } as never,
          ),
        ),
    });

    renderPage();
    await fillAndSubmit("operator@edara.com", "wrong-password");

    expect(await screen.findByText(/invalid email or password/i)).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
