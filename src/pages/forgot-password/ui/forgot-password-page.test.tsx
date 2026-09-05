import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ForgotPasswordPage } from "./forgot-password-page";

const navigateMock = vi.hoisted(() => vi.fn());
const postMock = vi.hoisted(() => vi.fn());

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    useNavigate: () => navigateMock,
    Link: ({ children }: { children: React.ReactNode }) => <a href="/login">{children}</a>,
  };
});

vi.mock("@/shared/api/client", () => ({
  apiClient: { post: postMock },
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
      <ForgotPasswordPage />
    </QueryClientProvider>,
  );
}

function submit(companyCode = "ACME", email = "eve@acme.com") {
  fireEvent.change(screen.getByLabelText(/company code/i), { target: { value: companyCode } });
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: email } });
  fireEvent.click(screen.getByRole("button", { name: /send reset link/i }));
}

describe("ForgotPasswordPage", () => {
  afterEach(() => {
    cleanup();
    navigateMock.mockClear();
    postMock.mockReset();
  });

  it("asks for the company code and the email address, the pair that names one account", () => {
    renderPage();

    expect(screen.getByLabelText(/company code/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  it("submits the pair and hands the address to the confirmation screen", async () => {
    postMock.mockReturnValue(jsonResponse({ ok: true }));

    renderPage();
    submit();

    await waitFor(() =>
      expect(postMock).toHaveBeenCalledWith(
        "auth/password-reset/request",
        expect.objectContaining({ json: { companyCode: "ACME", email: "eve@acme.com" } }),
      ),
    );
    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith({
        to: "/forgot-password/sent",
        search: { email: "eve@acme.com" },
      }),
    );
  });

  it("does not submit an incomplete form", async () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /send reset link/i }));

    expect(await screen.findByText(/company code is required/i)).toBeInTheDocument();
    expect(postMock).not.toHaveBeenCalled();
  });

  it("rejects an address that is not an email before it reaches the server", async () => {
    renderPage();
    submit("ACME", "not-an-email");

    expect(await screen.findByText(/valid email address/i)).toBeInTheDocument();
    expect(postMock).not.toHaveBeenCalled();
  });

  it("shows a system error rather than a blank screen when the request fails", async () => {
    const { HTTPError } = await import("ky");
    postMock.mockReturnValue({
      json: () =>
        Promise.reject(
          new HTTPError(
            new Response("{}", { status: 500 }),
            new Request("http://localhost/auth/password-reset/request"),
            { credentials: "same-origin" } as never,
          ),
        ),
    });

    renderPage();
    submit();

    expect(await screen.findByText(/something went wrong/i)).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
