import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/shared/auth";
import { LoginPage } from "./login-page";

const navigateMock = vi.hoisted(() => vi.fn());
const loginPostMock = vi.hoisted(() => vi.fn());
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
vi.mock("@/shared/api/client", () => ({
  apiClient: {
    post: loginPostMock,
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
          new Request("http://localhost/auth/login"),
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
      <LoginPage />
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
  publicId: "user-1",
  employeeCode: "EDA-001",
  firstName: "Sara",
  lastName: "Ahmed",
  email: "sara@edara.com",
  status: "ACTIVE" as const,
  companyCode: "EDARA",
  mustChangePassword: false,
  permissions: [],
  isOwner: false,
  isPlatformAdmin: false,
};

async function fillAndSubmit(companyCode: string, employeeCode: string, password: string) {
  fireEvent.change(screen.getByLabelText(/company code/i), { target: { value: companyCode } });
  fireEvent.change(screen.getByLabelText(/employee code/i), { target: { value: employeeCode } });
  fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: password } });
  fireEvent.click(screen.getByRole("button", { name: /sign in$/i }));
}

describe("LoginPage", () => {
  afterEach(() => {
    cleanup();
    navigateMock.mockClear();
    loginPostMock.mockReset();
    meGetMock.mockReset();
    useAuthStore.setState({ session: null, status: "anonymous" });
  });

  it("shows the 'need help signing in' affordance pointing to the HR administrator", () => {
    renderPage();

    expect(
      screen.getByText(/need help signing in\? contact your hr administrator/i),
    ).toBeInTheDocument();
  });

  it("logs in, hydrates from /auth/me, and redirects to the company dashboard", async () => {
    loginPostMock.mockReturnValue(jsonResponse(tokens));
    meGetMock.mockReturnValue(jsonResponse(baseMeResponse));

    renderPage();
    await fillAndSubmit("EDARA", "EDA-001", "S3curePass!");

    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith({ to: "/company/dashboard" }));
    expect(loginPostMock).toHaveBeenCalledWith(
      "auth/login",
      expect.objectContaining({
        json: {
          companyCode: "EDARA",
          employeeCode: "EDA-001",
          password: "S3curePass!",
          clientType: "web",
        },
      }),
    );
  });

  it("maps a generic credential-mismatch response (422, generic backend message) to the enumeration-safe copy", async () => {
    loginPostMock.mockReturnValue(await rejectedWith(422, { detail: "Invalid credentials" }));

    renderPage();
    await fillAndSubmit("EDARA", "EDA-001", "wrong-password");

    expect(
      await screen.findByText(/invalid company code, employee code, or password/i),
    ).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("maps a 401 with no parseable body to the enumeration-safe credential-mismatch copy", async () => {
    const { HTTPError } = await import("ky");
    loginPostMock.mockReturnValue({
      json: () =>
        Promise.reject(
          new HTTPError(
            new Response(null, { status: 401 }),
            new Request("http://localhost/auth/login"),
            { credentials: "same-origin" } as never,
          ),
        ),
    });

    renderPage();
    await fillAndSubmit("EDARA", "EDA-001", "wrong-password");

    expect(
      await screen.findByText(/invalid company code, employee code, or password/i),
    ).toBeInTheDocument();
  });

  it("surfaces the distinct, actionable lockout message returned by the backend", async () => {
    loginPostMock.mockReturnValue(
      await rejectedWith(403, {
        detail: "Account locked. Please wait or contact your HR administrator.",
      }),
    );

    renderPage();
    await fillAndSubmit("EDARA", "EDA-001", "S3curePass!");

    expect(
      await screen.findByText(/account locked\. please wait or contact your hr administrator/i),
    ).toBeInTheDocument();
  });

  it("surfaces the distinct, password-independent disabled-account message returned by the backend", async () => {
    loginPostMock.mockReturnValue(
      await rejectedWith(403, {
        detail: "This account can't sign in. Please contact your HR administrator.",
      }),
    );

    renderPage();
    await fillAndSubmit("EDARA", "EDA-001", "totally-wrong-password");

    expect(
      await screen.findByText(/this account can't sign in\. please contact your hr administrator/i),
    ).toBeInTheDocument();
  });

  it("surfaces the distinct expired-invitation message returned by the backend", async () => {
    loginPostMock.mockReturnValue(
      await rejectedWith(422, {
        detail: "Your invitation has expired. Please ask your HR administrator for a new one.",
      }),
    );

    renderPage();
    await fillAndSubmit("EDARA", "EDA-001", "TempP@ss1");

    expect(
      await screen.findByText(
        /your invitation has expired\. please ask your hr administrator for a new one/i,
      ),
    ).toBeInTheDocument();
  });

  it("maps a 429 to the rate-limit copy", async () => {
    loginPostMock.mockReturnValue(await rejectedWith(429, { detail: "Too many requests" }));

    renderPage();
    await fillAndSubmit("EDARA", "EDA-001", "S3curePass!");

    expect(
      await screen.findByText(/too many attempts\. please wait a moment and try again/i),
    ).toBeInTheDocument();
  });

  it("maps a 5xx / network failure to the generic system-error copy", async () => {
    loginPostMock.mockReturnValue(await rejectedWith(500, { detail: "Internal Server Error" }));

    renderPage();
    await fillAndSubmit("EDARA", "EDA-001", "S3curePass!");

    expect(await screen.findByText(/something went wrong\. please try again/i)).toBeInTheDocument();
  });
});
