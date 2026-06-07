import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ForcedPasswordChangeModal } from "./forced-password-change-modal";
import { useAuthStore } from "./store";
import type { AuthSession, SessionUser } from "./types";

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
