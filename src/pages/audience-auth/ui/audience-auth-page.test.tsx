import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OperationRefusal } from "@/shared/api";
import {
  type CompanySession,
  credentialSearchSchema,
  useCompanySession,
  usePlatformSession,
} from "@/shared/auth";
import { i18next } from "@/shared/i18n";
import { AudienceAuthPage } from "./audience-auth-page";

const actions = vi.hoisted(() => ({
  signIn: vi.fn(),
  invitation: vi.fn(),
  recovery: vi.fn(),
  reset: vi.fn(),
  signOut: vi.fn(),
  revalidate: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock("@tanstack/react-router", async (original) => ({
  ...(await original<typeof import("@tanstack/react-router")>()),
  useNavigate: () => actions.navigate,
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));
vi.mock("@/shared/company-auth", async (original) => ({
  ...(await original<typeof import("@/shared/company-auth")>()),
  signInCompany: actions.signIn,
  acceptCompanyInvitation: actions.invitation,
  requestCompanyRecovery: actions.recovery,
  confirmCompanyRecovery: actions.reset,
  signOutCompany: actions.signOut,
  revalidateCompanySession: actions.revalidate,
}));

const session: CompanySession = {
  accessToken: "company-access",
  refreshToken: "company-refresh",
  sessionId: "cc9c00d9-e2d0-497d-810f-24da77075ffc",
  expiresIn: 900,
  mustChangePassword: false,
  user: {
    publicId: "cc9c00d9-e2d0-497d-810f-24da77075ffc",
    firstName: "Sara",
    lastName: "Ahmed",
    email: "sara@example.test",
    companyCode: "EDARA",
    employeeCode: "EMP-1",
    companyPublicId: "ace09ed2-c5bd-4474-bac9-78a7bb659da3",
    status: "ACTIVE",
    permissions: [],
    isOwner: false,
    mustChangePassword: false,
    photoUrl: null,
    locale: "en",
    timezone: "UTC",
  },
};

function renderPage(mode: "login" | "invitation" | "recovery" | "reset" = "login") {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
        })
      }
    >
      <AudienceAuthPage
        audience="company"
        mode={mode}
        search={credentialSearchSchema.parse(
          Object.fromEntries(new URLSearchParams(window.location.search)),
        )}
      />
    </QueryClientProvider>,
  );
}

function submitForm(buttonName: string) {
  const form = screen.getByRole("button", { name: buttonName }).closest("form");
  if (!form) throw new Error("Credential form is missing");
  fireEvent.submit(form);
}

afterEach(async () => {
  cleanup();
  vi.resetAllMocks();
  useCompanySession.getState().clearSession();
  usePlatformSession.getState().clearSession();
  window.history.replaceState(null, "", "/company/login");
  await i18next.changeLanguage("en");
});

describe("audience credential page", () => {
  it("retains the draft after a rate-limited attempt without exposing server details", async () => {
    actions.signIn.mockRejectedValueOnce(
      new OperationRefusal(
        {
          audience: "company",
          key: "POST /api/v1/company/auth/login",
          parseResponse: () => undefined,
        },
        429,
        { detail: "internal canary" },
      ),
    );
    renderPage();
    await screen.findByLabelText("Company code", {}, { timeout: 10000 });
    fireEvent.change(screen.getByLabelText("Company code"), { target: { value: "EDARA" } });
    fireEvent.change(screen.getByLabelText("Employee code"), { target: { value: "EMP-1" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password" } });
    submitForm("Sign in");
    expect(
      await screen.findByText("Too many attempts. Please wait a moment and try again."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Employee code")).toHaveValue("EMP-1");
    expect(screen.queryByText("internal canary")).not.toBeInTheDocument();
  });

  it("reports local-only sign-out without claiming remote revocation", async () => {
    window.history.replaceState(null, "", "/company/login?localSignOutOnly=true");
    renderPage();
    expect(
      await screen.findByText(/We could not confirm sign-out on the server/),
    ).toBeInTheDocument();
  });

  it("uses generated Company bounds rather than submitting an invalid Company code", async () => {
    renderPage();
    fireEvent.change(await screen.findByLabelText("Company code"), {
      target: { value: "CODE-TOO-LONG" },
    });
    fireEvent.change(screen.getByLabelText("Employee code"), { target: { value: "EMP-1" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password" } });
    submitForm("Sign in");
    expect(
      await screen.findByText("Check the highlighted fields and try again."),
    ).toBeInTheDocument();
    expect(actions.signIn).not.toHaveBeenCalled();
  });

  it("does not expose an arbitrary failure detail in the credential page", async () => {
    actions.signIn.mockRejectedValueOnce(new Error("internal-server-canary"));
    renderPage();
    fireEvent.change(await screen.findByLabelText("Company code"), { target: { value: "EDARA" } });
    fireEvent.change(screen.getByLabelText("Employee code"), { target: { value: "EMP-1" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password" } });
    submitForm("Sign in");
    expect(
      await screen.findByText("We could not sign you in. Check your credentials and try again."),
    ).toBeInTheDocument();
    expect(screen.queryByText("internal-server-canary")).not.toBeInTheDocument();
  });

  it("offers Continue or Company-only sign-out instead of replacing an occupied slot", async () => {
    useCompanySession.getState().setSession(session);
    renderPage("invitation");
    expect(await screen.findByRole("button", { name: "Continue" })).toBeInTheDocument();
    expect(screen.queryByLabelText("New password")).not.toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: "Sign out of Company Portal" }),
    ).toBeInTheDocument();
    expect(actions.invitation).not.toHaveBeenCalled();
  });

  it("passes the scoped invitation link only to the matching generated action", async () => {
    window.history.replaceState(
      null,
      "",
      `/company/accept-invitation?token=invitation-canary&companyPublicId=${session.user.companyPublicId}`,
    );
    actions.invitation.mockResolvedValueOnce(session);
    renderPage("invitation");
    fireEvent.change(await screen.findByLabelText("New password"), {
      target: { value: "New-password-1!" },
    });
    fireEvent.change(screen.getByLabelText("Confirm new password"), {
      target: { value: "New-password-1!" },
    });
    submitForm("Accept invitation");
    await waitFor(() =>
      expect(actions.invitation).toHaveBeenCalledWith({
        token: "invitation-canary",
        companyPublicId: session.user.companyPublicId,
        newPassword: "New-password-1!",
        clientType: "web",
      }),
    );
    expect(screen.queryByText("invitation-canary")).not.toBeInTheDocument();
    expect(actions.navigate).toHaveBeenCalledWith({ href: "/company/dashboard" });
  });

  it("does not redeem a Company recovery link missing its Company scope", async () => {
    window.history.replaceState(null, "", "/company/reset-password?token=reset-canary");
    renderPage("reset");
    fireEvent.change(await screen.findByLabelText("New password"), {
      target: { value: "New-password-1!" },
    });
    fireEvent.change(screen.getByLabelText("Confirm new password"), {
      target: { value: "New-password-1!" },
    });
    submitForm("Reset password");
    expect(
      await screen.findByText(/Check your password and invitation or reset link/),
    ).toBeInTheDocument();
    expect(actions.reset).not.toHaveBeenCalled();
  });

  it("reports recovery neutrally and does not authenticate", async () => {
    actions.recovery.mockResolvedValueOnce(undefined);
    renderPage("recovery");
    fireEvent.change(await screen.findByLabelText("Company code"), { target: { value: "EDARA" } });
    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "person@example.test" },
    });
    submitForm("Send reset link");
    expect(await screen.findByText(/If the details match an account/)).toBeInTheDocument();
    expect(useCompanySession.getState().session).toBeNull();
    expect(actions.navigate).not.toHaveBeenCalled();
  });

  it("renders the same credential controls in Arabic", async () => {
    await i18next.changeLanguage("ar");
    renderPage();
    expect(await screen.findByLabelText("رمز الشركة")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "تسجيل الدخول" })).toBeInTheDocument();
  });
});
