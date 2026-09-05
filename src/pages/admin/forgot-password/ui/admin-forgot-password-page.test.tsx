import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminForgotPasswordPage } from "./admin-forgot-password-page";

const navigateMock = vi.hoisted(() => vi.fn());
const postMock = vi.hoisted(() => vi.fn());

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    useNavigate: () => navigateMock,
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
      <AdminForgotPasswordPage />
    </QueryClientProvider>,
  );
}

function submit(email = "ada@edara.com") {
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: email } });
  fireEvent.click(screen.getByRole("button", { name: /send reset link/i }));
}

describe("AdminForgotPasswordPage", () => {
  afterEach(() => {
    cleanup();
    navigateMock.mockClear();
    postMock.mockReset();
  });

  it("asks only for the address — an operator belongs to no company", () => {
    renderPage();

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/company code/i)).not.toBeInTheDocument();
  });

  it("posts to the admin surface, never the tenant one", async () => {
    postMock.mockReturnValue({ json: () => Promise.resolve({ ok: true }) });

    renderPage();
    submit();

    await waitFor(() =>
      expect(postMock).toHaveBeenCalledWith(
        "auth/admin/password-reset/request",
        expect.objectContaining({ json: { email: "ada@edara.com" } }),
      ),
    );
    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith({
        to: "/admin/forgot-password/sent",
        search: { email: "ada@edara.com" },
      }),
    );
  });

  it("rejects an address that is not an email before it reaches the server", async () => {
    renderPage();
    submit("not-an-email");

    expect(await screen.findByText(/valid email address/i)).toBeInTheDocument();
    expect(postMock).not.toHaveBeenCalled();
  });
});
