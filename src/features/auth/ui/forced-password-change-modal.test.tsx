import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AuthSession, SessionUser } from "@/shared/auth";
import { useAuthStore } from "@/shared/auth";
import { ForcedPasswordChangeModal } from "./forced-password-change-modal";

const navigateMock = vi.hoisted(() => vi.fn());
const changePasswordPostMock = vi.hoisted(() => vi.fn());

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return { ...actual, useNavigate: () => navigateMock };
});

// `ky` (the apiClient's HTTP layer) constructs AbortSignals that jsdom's fetch
// rejects as cross-realm — stub the client boundary instead of the network.
vi.mock("@/shared/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api")>()),
  apiClient: { post: changePasswordPostMock },
}));

function renderModal() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ForcedPasswordChangeModal />
    </QueryClientProvider>,
  );
}

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

function buildSession(userOverrides: Partial<SessionUser> = {}): AuthSession {
  return {
    accessToken: "access-token",
    refreshToken: "refresh-token",
    sessionId: "session-1",
    expiresIn: 900,
    user: { ...baseUser, ...userOverrides },
  };
}

describe("ForcedPasswordChangeModal", () => {
  afterEach(() => {
    cleanup();
    navigateMock.mockClear();
    changePasswordPostMock.mockReset();
    useAuthStore.setState({ session: null, status: "anonymous" });
  });

  it("does not render when mustChangePassword is false", () => {
    useAuthStore.setState({
      session: buildSession({ mustChangePassword: false }),
      status: "authenticated",
    });

    renderModal();

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders the blocking dialog with the change-password form when mustChangePassword is true", () => {
    useAuthStore.setState({
      session: buildSession({ mustChangePassword: true }),
      status: "must_change_password",
    });

    renderModal();

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByLabelText(/current password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^new password/i)).toBeInTheDocument();
  });

  it("renders no close/dismiss button", () => {
    useAuthStore.setState({
      session: buildSession({ mustChangePassword: true }),
      status: "must_change_password",
    });

    renderModal();

    expect(screen.queryByRole("button", { name: /close|dismiss|cancel/i })).not.toBeInTheDocument();
  });

  it("does not dismiss when the backdrop is clicked", () => {
    useAuthStore.setState({
      session: buildSession({ mustChangePassword: true }),
      status: "must_change_password",
    });

    renderModal();

    const backdrop = document.querySelector('[aria-hidden="true"]');
    expect(backdrop).not.toBeNull();
    if (backdrop) fireEvent.click(backdrop);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("clears the session and redirects to /login after a successful password change", async () => {
    useAuthStore.setState({
      session: buildSession({ mustChangePassword: true }),
      status: "must_change_password",
    });

    changePasswordPostMock.mockReturnValue({ json: () => Promise.resolve({ ok: true }) });

    renderModal();

    fireEvent.change(screen.getByLabelText(/current password/i), {
      target: { value: "TempPass1!" },
    });
    fireEvent.change(screen.getByLabelText(/^new password/i), {
      target: { value: "NewSecret1!" },
    });
    fireEvent.change(screen.getByLabelText(/confirm new password/i), {
      target: { value: "NewSecret1!" },
    });
    fireEvent.click(screen.getByRole("button", { name: /change password/i }));

    await waitFor(() => {
      expect(useAuthStore.getState().session).toBeNull();
    });
    expect(useAuthStore.getState().status).toBe("anonymous");
    expect(changePasswordPostMock).toHaveBeenCalledWith(
      "auth/change-password",
      expect.objectContaining({
        json: { currentPassword: "TempPass1!", newPassword: "NewSecret1!" },
      }),
    );
    expect(navigateMock).toHaveBeenCalledWith({ to: "/login" });
  });

  it("does not dismiss when Escape is pressed", () => {
    useAuthStore.setState({
      session: buildSession({ mustChangePassword: true }),
      status: "must_change_password",
    });

    renderModal();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
