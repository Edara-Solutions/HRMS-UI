import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OperationRefusal } from "@/shared/api";
import {
  type AudienceName,
  type CompanySession,
  credentialSearchSchema,
  useCompanySession,
  usePlatformSession,
} from "@/shared/auth";
import { i18next } from "@/shared/i18n";
import { companySessionFixture, platformSessionFixture } from "../../../test/audience-fixtures";
import { json, problem } from "../../../test/network-fixtures";
import { AudienceAuthPage } from "./audience-auth-page";

const actions = vi.hoisted(() => ({
  signIn: vi.fn(),
  platformSignIn: vi.fn(),
  invitation: vi.fn(),
  recovery: vi.fn(),
  reset: vi.fn(),
  signOut: vi.fn(),
  revalidate: vi.fn(),
  navigate: vi.fn(),
}));

const network = vi.hoisted(() => ({ respond: vi.fn() }));

vi.mock("@/shared/api/company-client", () => ({
  companyApiClient: Object.assign(
    async (path: string, options: { method: string }) =>
      network.respond(`${options.method} /${path}`),
    { audience: "company" },
  ),
}));
vi.mock("@/shared/api/platform-client", () => {
  const client = async (path: string, options: { method: string }) =>
    network.respond(`${options.method} /${path}`);
  return {
    platformApiClient: Object.assign(client, { audience: "platform" }),
    delegatedApiClient: Object.assign(async () => client, { audience: "delegated" }),
  };
});

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

vi.mock("@/shared/platform-auth", async (original) => ({
  ...(await original<typeof import("@/shared/platform-auth")>()),
  signInPlatform: actions.platformSignIn,
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

const neutralSignInFailure =
  "We couldn't sign you in. Please try again, or contact your administrator if this keeps happening.";

function operation(audience: AudienceName, key: string) {
  return { audience, key, parseResponse: () => undefined };
}

const signInFailures = [
  {
    cause: "rejected credentials",
    error: (audience: AudienceName) =>
      new OperationRefusal(operation(audience, `POST /api/v1/${audience}/auth/login`), 401, {
        detail: "internal-server-canary",
      }),
  },
  { cause: "a network failure", error: () => new TypeError("internal-server-canary") },
  {
    cause: "a rejected identity lookup",
    error: (audience: AudienceName) =>
      new OperationRefusal(operation(audience, `GET /api/v1/${audience}/me`), 401, {
        detail: "internal-server-canary",
      }),
  },
  { cause: "an unexpected failure", error: () => new Error("internal-server-canary") },
];

function html502() {
  return new Response("<html><body>Bad gateway canary</body></html>", {
    status: 502,
    headers: { "Content-Type": "text/html" },
  });
}

const responseFailures = [
  {
    cause: "a 500 from login",
    routes: (audience: AudienceName): Record<string, () => Response> => ({
      [`POST /api/v1/${audience}/auth/login`]: () => problem(500),
    }),
  },
  {
    cause: "an HTML 502 from login",
    routes: (audience: AudienceName): Record<string, () => Response> => ({
      [`POST /api/v1/${audience}/auth/login`]: html502,
    }),
  },
  {
    cause: "a 503 from the identity lookup",
    routes: (audience: AudienceName, tokens: unknown): Record<string, () => Response> => ({
      [`POST /api/v1/${audience}/auth/login`]: () => json(tokens),
      [`GET /api/v1/${audience}/me`]: () => problem(503),
    }),
  },
  {
    cause: "an HTML 502 from the identity lookup",
    routes: (audience: AudienceName, tokens: unknown): Record<string, () => Response> => ({
      [`POST /api/v1/${audience}/auth/login`]: () => json(tokens),
      [`GET /api/v1/${audience}/me`]: html502,
    }),
  },
];

async function fillCompanySignIn() {
  fireEvent.change(await screen.findByLabelText("Company code", {}, { timeout: 10000 }), {
    target: { value: "EDARA" },
  });
  fireEvent.change(screen.getByLabelText("Employee code"), { target: { value: "EMP-1" } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password" } });
}

async function fillPlatformSignIn() {
  fireEvent.change(await screen.findByLabelText("Email address", {}, { timeout: 10000 }), {
    target: { value: "operator@example.test" },
  });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password" } });
}

const portals = [
  {
    audience: "company" as const,
    session: companySessionFixture(),
    fill: fillCompanySignIn,
    useRealSignIn: async () => {
      const real =
        await vi.importActual<typeof import("@/shared/company-auth")>("@/shared/company-auth");
      actions.signIn.mockImplementation(real.signInCompany);
    },
  },
  {
    audience: "platform" as const,
    session: platformSessionFixture(),
    fill: fillPlatformSignIn,
    useRealSignIn: async () => {
      const real =
        await vi.importActual<typeof import("@/shared/platform-auth")>("@/shared/platform-auth");
      actions.platformSignIn.mockImplementation(real.signInPlatform);
    },
  },
];

function routeNetwork(routes: Record<string, () => Response>) {
  network.respond.mockImplementation((key: string) => {
    const handler = routes[key];
    if (!handler) throw new Error(`Unexpected operation ${key}`);
    return handler();
  });
}

function renderPage(
  mode: "login" | "invitation" | "recovery" | "reset" = "login",
  audience: AudienceName = "company",
) {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
        })
      }
    >
      <AudienceAuthPage
        audience={audience}
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

  it.each(signInFailures)("shows the neutral Company sign-in message after $cause", async ({
    error,
  }) => {
    actions.signIn.mockRejectedValueOnce(error("company"));
    renderPage();
    await fillCompanySignIn();
    submitForm("Sign in");
    expect(await screen.findByText(neutralSignInFailure)).toBeInTheDocument();
    expect(screen.queryByText(/internal-server-canary/)).not.toBeInTheDocument();
  });

  it.each(signInFailures)("shows the neutral Platform sign-in message after $cause", async ({
    error,
  }) => {
    window.history.replaceState(null, "", "/platform/login");
    actions.platformSignIn.mockRejectedValueOnce(error("platform"));
    renderPage("login", "platform");
    await fillPlatformSignIn();
    submitForm("Sign in");
    expect(await screen.findByText(neutralSignInFailure)).toBeInTheDocument();
    expect(screen.queryByText(/internal-server-canary/)).not.toBeInTheDocument();
  });

  describe.each(portals)("$audience sign-in over the network", (portal) => {
    it.each(responseFailures)("shows the neutral message after $cause", async ({ routes }) => {
      const { user: _user, ...tokens } = portal.session;
      routeNetwork(routes(portal.audience, tokens));
      await portal.useRealSignIn();
      window.history.replaceState(null, "", `/${portal.audience}/login`);
      renderPage("login", portal.audience);
      await portal.fill();
      submitForm("Sign in");
      expect(await screen.findByText(neutralSignInFailure)).toBeInTheDocument();
      expect(screen.queryByText(/canary/)).not.toBeInTheDocument();
    });

    it("keeps a malformed successful login on the access-unavailable message", async () => {
      routeNetwork({ [`POST /api/v1/${portal.audience}/auth/login`]: () => json({}) });
      await portal.useRealSignIn();
      window.history.replaceState(null, "", `/${portal.audience}/login`);
      renderPage("login", portal.audience);
      await portal.fill();
      submitForm("Sign in");
      expect(
        await screen.findByText("We could not confirm access right now. Please try again."),
      ).toBeInTheDocument();
      expect(screen.queryByText(neutralSignInFailure)).not.toBeInTheDocument();
    });
  });

  it("keeps Platform rate-limit feedback distinct from the neutral message", async () => {
    window.history.replaceState(null, "", "/platform/login");
    actions.platformSignIn.mockRejectedValueOnce(
      new OperationRefusal(operation("platform", "POST /api/v1/platform/auth/login"), 429, {
        detail: "internal canary",
      }),
    );
    renderPage("login", "platform");
    await fillPlatformSignIn();
    submitForm("Sign in");
    expect(
      await screen.findByText("Too many attempts. Please wait a moment and try again."),
    ).toBeInTheDocument();
    expect(screen.queryByText(neutralSignInFailure)).not.toBeInTheDocument();
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

  it("flags a Company recovery link missing its Company scope before asking for a password", async () => {
    window.history.replaceState(null, "", "/company/reset-password?token=reset-canary");
    renderPage("reset");
    expect(
      await screen.findByText("This link is incomplete or no longer valid. Request a new one."),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("New password")).not.toBeInTheDocument();
    expect(actions.reset).not.toHaveBeenCalled();
  });

  it("flags an invitation link without its token on arrival", async () => {
    window.history.replaceState(
      null,
      "",
      "/company/accept-invitation?companyPublicId=ace09ed2-c5bd-4474-bac9-78a7bb659da3",
    );
    renderPage("invitation");
    expect(
      await screen.findByText("This link is incomplete or no longer valid. Request a new one."),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("New password")).not.toBeInTheDocument();
  });

  it("names the specific problem under each field", async () => {
    renderPage();
    fireEvent.change(await screen.findByLabelText("Company code"), {
      target: { value: "CODE-TOO-LONG" },
    });
    submitForm("Sign in");
    expect(await screen.findByText("Use at most 10 characters.")).toBeInTheDocument();
    expect(screen.getAllByText("This field is required.")).toHaveLength(2);
    expect(actions.signIn).not.toHaveBeenCalled();
  });

  it("asks for a valid email when requesting recovery", async () => {
    window.history.replaceState(null, "", "/company/forgot-password");
    renderPage("recovery");
    fireEvent.change(await screen.findByLabelText("Company code"), { target: { value: "EDARA" } });
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "not-an-email" } });
    submitForm("Send reset link");
    expect(await screen.findByText("Enter a valid email address.")).toBeInTheDocument();
    expect(actions.recovery).not.toHaveBeenCalled();
  });

  it("keeps the password rule off sign-in fields", async () => {
    renderPage();
    expect(await screen.findByLabelText("Company code")).not.toHaveAccessibleDescription();
    expect(screen.getByLabelText("Password")).not.toHaveAccessibleDescription();
  });

  it("states the Company password rule before the user types", async () => {
    window.history.replaceState(
      null,
      "",
      "/company/accept-invitation?companyPublicId=ace09ed2-c5bd-4474-bac9-78a7bb659da3&token=invite",
    );
    renderPage("invitation");
    expect(await screen.findByLabelText("New password")).toHaveAccessibleDescription(
      "Use at least 8 characters, with upper and lower case letters, a number and a symbol.",
    );
  });

  it("names the missing character types when the password breaks the rule", async () => {
    window.history.replaceState(
      null,
      "",
      "/company/accept-invitation?companyPublicId=ace09ed2-c5bd-4474-bac9-78a7bb659da3&token=invite",
    );
    renderPage("invitation");
    fireEvent.change(await screen.findByLabelText("New password"), {
      target: { value: "longenoughbutplain" },
    });
    fireEvent.change(screen.getByLabelText("Confirm new password"), {
      target: { value: "longenoughbutplain" },
    });
    submitForm("Accept invitation");
    expect(
      await screen.findByText(
        "Include upper and lower case letters, a number and a symbol (!@#$%^&*()_+-=).",
      ),
    ).toBeInTheDocument();
    expect(actions.invitation).not.toHaveBeenCalled();
  });

  it("shows a password mismatch under the confirmation field", async () => {
    window.history.replaceState(
      null,
      "",
      "/company/accept-invitation?companyPublicId=ace09ed2-c5bd-4474-bac9-78a7bb659da3&token=invite",
    );
    renderPage("invitation");
    fireEvent.change(await screen.findByLabelText("New password"), {
      target: { value: "New-password-1!" },
    });
    fireEvent.change(screen.getByLabelText("Confirm new password"), {
      target: { value: "Other-password-1!" },
    });
    submitForm("Accept invitation");
    const confirm = screen.getByLabelText("Confirm new password");
    expect(confirm).toHaveAttribute("aria-invalid", "true");
    expect(confirm).toHaveAccessibleDescription("The passwords do not match.");
    expect(actions.invitation).not.toHaveBeenCalled();
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
