import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CompanySession, CompanyUser } from "@/shared/auth";
import { useCompanySession, usePlatformSession } from "@/shared/auth";
import { ForcedPasswordChangeModal } from "./forced-password-change-modal";

const navigateMock = vi.hoisted(() => vi.fn());
const changePasswordPostMock = vi.hoisted(() => vi.fn());
const meGetMock = vi.hoisted(() => vi.fn());

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return { ...actual, useNavigate: () => navigateMock };
});

// `ky` (the apiClient's HTTP layer) constructs AbortSignals that jsdom's fetch
// rejects as cross-realm — stub the client boundary instead of the network.
vi.mock("@/shared/api/company-client", () => ({
  companyApiClient: Object.assign(
    (path: string, options: { method: string }) =>
      options.method === "POST" ? changePasswordPostMock(path, options) : meGetMock(path, options),
    { audience: "company", post: changePasswordPostMock, get: meGetMock },
  ),
}));

function renderModal() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ForcedPasswordChangeModal audience="company" />
    </QueryClientProvider>,
  );
}

const baseUser: CompanyUser = {
  publicId: "cdebc050-5b45-4c15-a199-44ce6a4161ba",
  employeeCode: "EMP-001",
  firstName: "Jane",
  lastName: "Doe",
  email: "jane@example.com",
  status: "ACTIVE",
  companyCode: "ACME",
  mustChangePassword: false,
  permissions: [],
  isOwner: false,
  companyPublicId: "379dd5ae-49e0-4bbe-90b9-1125f0802729",
  locale: "en",
  timezone: "UTC",
  photoUrl: null,
};

function buildSession(userOverrides: Partial<CompanyUser> = {}): CompanySession {
  return {
    accessToken: "access-token",
    refreshToken: "refresh-token",
    sessionId: "b2b0369d-e6f3-4b8a-aa86-8c6053b19b19",
    expiresIn: 900,
    mustChangePassword: false,
    user: { ...baseUser, ...userOverrides },
  };
}

describe("ForcedPasswordChangeModal", () => {
  afterEach(() => {
    cleanup();
    navigateMock.mockClear();
    changePasswordPostMock.mockReset();
    meGetMock.mockReset();
    useCompanySession.getState().clearSession();
    usePlatformSession.getState().clearSession();
  });

  it("does not render when mustChangePassword is false", () => {
    useCompanySession.setState({
      session: buildSession({ mustChangePassword: false }),
      status: "authenticated",
    });

    renderModal();

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders the blocking dialog with the change-password form when mustChangePassword is true", () => {
    useCompanySession.setState({
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
    useCompanySession.setState({
      session: buildSession({ mustChangePassword: true }),
      status: "must_change_password",
    });

    renderModal();

    expect(screen.queryByRole("button", { name: /close|dismiss|cancel/i })).not.toBeInTheDocument();
  });

  it("does not dismiss when the backdrop is clicked", () => {
    useCompanySession.setState({
      session: buildSession({ mustChangePassword: true }),
      status: "must_change_password",
    });

    renderModal();

    const backdrop = document.querySelector('[aria-hidden="true"]');
    expect(backdrop).not.toBeNull();
    if (backdrop) fireEvent.click(backdrop);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("hydrates /auth/me and enters tenant context after a successful password change", async () => {
    useCompanySession.setState({
      session: buildSession({ mustChangePassword: true }),
      status: "must_change_password",
    });

    changePasswordPostMock.mockReturnValue(new Response(null, { status: 204 }));
    const wireUser = baseUser;
    meGetMock.mockReturnValue(
      new Response(JSON.stringify({ ...wireUser, mustChangePassword: false, isOwner: true }), {
        status: 200,
      }),
    );

    renderModal();

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /change password/i })).toBeEnabled(),
    );
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
      expect(useCompanySession.getState().session?.user.mustChangePassword).toBe(false);
    });
    expect(useCompanySession.getState().status).toBe("authenticated");
    expect(changePasswordPostMock).toHaveBeenCalledWith(
      "api/v1/company/me/password",
      expect.objectContaining({
        json: { currentPassword: "TempPass1!", newPassword: "NewSecret1!" },
      }),
    );
    expect(meGetMock).toHaveBeenCalledWith(
      "api/v1/company/me",
      expect.objectContaining({ method: "GET" }),
    );
    expect(navigateMock).toHaveBeenCalledWith({ href: "/company/dashboard" });
  });

  it("does not dismiss when Escape is pressed", () => {
    useCompanySession.setState({
      session: buildSession({ mustChangePassword: true }),
      status: "must_change_password",
    });

    renderModal();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
