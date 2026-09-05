import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminResetPasswordPage } from "./admin-reset-password-page";

const navigateMock = vi.hoisted(() => vi.fn());
const searchMock = vi.hoisted(() =>
  vi.fn((): { token: string | undefined } => ({ token: "admin-reset-token" })),
);
const postMock = vi.hoisted(() => vi.fn());

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useSearch: () => searchMock(),
    Link: ({ children }: { children: React.ReactNode }) => <a href="/admin/login">{children}</a>,
  };
});

vi.mock("@/shared/api/client", () => ({
  apiClient: { post: postMock },
}));

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AdminResetPasswordPage />
    </QueryClientProvider>,
  );
}

describe("AdminResetPasswordPage", () => {
  afterEach(() => {
    cleanup();
    navigateMock.mockClear();
    searchMock.mockReset();
    searchMock.mockReturnValue({ token: "admin-reset-token" });
    postMock.mockReset();
  });

  it("redeems the token and sends the operator back to the admin sign-in", async () => {
    postMock.mockReturnValue({ json: () => Promise.resolve({ ok: true }) });

    renderPage();
    fireEvent.change(screen.getByLabelText(/^new password$/i), {
      target: { value: "Str0ng!Passw0rd" },
    });
    fireEvent.change(screen.getByLabelText(/confirm new password/i), {
      target: { value: "Str0ng!Passw0rd" },
    });
    fireEvent.click(screen.getByRole("button", { name: /set new password/i }));

    await waitFor(() =>
      expect(postMock).toHaveBeenCalledWith(
        "auth/password-reset/confirm",
        expect.objectContaining({
          json: { token: "admin-reset-token", newPassword: "Str0ng!Passw0rd" },
        }),
      ),
    );
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith({ to: "/admin/login" }));
  });

  it("says the link is unusable when the page is opened without a token", async () => {
    searchMock.mockReturnValue({ token: undefined });

    renderPage();

    expect(await screen.findByText(/invalid or has expired/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /set new password/i })).toBeDisabled();
  });
});
