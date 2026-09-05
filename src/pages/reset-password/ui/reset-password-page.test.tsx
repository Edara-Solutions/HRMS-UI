import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ResetPasswordPage } from "./reset-password-page";

const navigateMock = vi.hoisted(() => vi.fn());
const searchMock = vi.hoisted(() =>
  vi.fn((): { token: string | undefined } => ({ token: "reset-token" })),
);
const postMock = vi.hoisted(() => vi.fn());

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useSearch: () => searchMock(),
    Link: ({ children }: { children: React.ReactNode }) => <a href="/login">{children}</a>,
  };
});

vi.mock("@/shared/api/client", () => ({
  apiClient: { post: postMock },
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
          new Request("http://localhost/auth/password-reset/confirm"),
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
      <ResetPasswordPage />
    </QueryClientProvider>,
  );
}

function submit(password = "Str0ng!Passw0rd", confirmation = password) {
  fireEvent.change(screen.getByLabelText(/^new password$/i), { target: { value: password } });
  fireEvent.change(screen.getByLabelText(/confirm new password/i), {
    target: { value: confirmation },
  });
  fireEvent.click(screen.getByRole("button", { name: /set new password/i }));
}

describe("ResetPasswordPage", () => {
  afterEach(() => {
    cleanup();
    navigateMock.mockClear();
    searchMock.mockReset();
    searchMock.mockReturnValue({ token: "reset-token" });
    postMock.mockReset();
  });

  it("redeems the token from the link and sends the caller back to sign in", async () => {
    postMock.mockReturnValue(jsonResponse({ ok: true }));

    renderPage();
    submit();

    await waitFor(() =>
      expect(postMock).toHaveBeenCalledWith(
        "auth/password-reset/confirm",
        expect.objectContaining({
          json: { token: "reset-token", newPassword: "Str0ng!Passw0rd" },
        }),
      ),
    );
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith({ to: "/login" }));
  });

  it("refuses a mismatched confirmation", async () => {
    renderPage();
    submit("Str0ng!Passw0rd", "Different!Passw0rd");

    expect(await screen.findByText(/passwords don't match/i)).toBeInTheDocument();
    expect(postMock).not.toHaveBeenCalled();
  });

  it("refuses a password the server would reject anyway, before spending the link on it", async () => {
    renderPage();
    submit("password");

    expect(await screen.findByText(/uppercase|number|symbol|at least 8/i)).toBeInTheDocument();
    expect(postMock).not.toHaveBeenCalled();
  });

  it("says the link is unusable, and offers a new one, when the page is opened without a token", async () => {
    searchMock.mockReturnValue({ token: undefined });

    renderPage();

    expect(await screen.findByText(/invalid or has expired/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /set new password/i })).toBeDisabled();
  });

  it("explains an expired or already-used link instead of leaving the caller stuck", async () => {
    postMock.mockReturnValue(
      await rejectedWith(422, { error: "This password reset link is invalid or has expired." }),
    );

    renderPage();
    submit();

    expect(await screen.findByText(/invalid or has expired/i)).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
