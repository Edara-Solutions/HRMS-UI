import { afterEach, describe, expect, it, vi } from "vitest";
import { isAdminConsoleEnabled, requireAdminConsoleEnabled, requireAuthenticated } from "./guards";
import { useAuthStore } from "./store";
import type { AuthSession, SessionUser } from "./types";

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

function redirectTarget(fn: () => unknown): unknown {
  try {
    fn();
    throw new Error("Expected a redirect to be thrown");
  } catch (thrown) {
    return thrown;
  }
}

describe("requireAuthenticated", () => {
  afterEach(() => {
    useAuthStore.setState({ session: null, status: "anonymous" });
  });

  it("redirects to /login when there is no session", () => {
    useAuthStore.setState({ session: null, status: "anonymous" });

    expect(redirectTarget(() => requireAuthenticated())).toMatchObject({
      options: { to: "/login" },
    });
  });

  it("redirects to /change-password when mustChangePassword is true, even on an unrelated route", () => {
    useAuthStore.setState({
      session: buildSession({ mustChangePassword: true }),
      status: "must_change_password",
    });

    expect(
      redirectTarget(() => requireAuthenticated({ requiredPermissions: ["users:read"] })),
    ).toMatchObject({ options: { to: "/change-password" } });
  });

  it("does not redirect once the session reflects mustChangePassword === false", () => {
    const session = buildSession({ mustChangePassword: false });
    useAuthStore.setState({ session, status: "authenticated" });

    expect(requireAuthenticated()).toEqual(session);
  });

  it("bounces a non-platform-admin to /company/dashboard from a platformAdminOnly route", () => {
    useAuthStore.setState({
      session: buildSession({ isPlatformAdmin: false }),
      status: "authenticated",
    });

    expect(redirectTarget(() => requireAuthenticated({ platformAdminOnly: true }))).toMatchObject({
      options: { to: "/company/dashboard" },
    });
  });

  it("bounces a tenant owner (isOwner) from a platformAdminOnly route — owner is company-scoped, not global", () => {
    useAuthStore.setState({
      session: buildSession({ isOwner: true, isPlatformAdmin: false }),
      status: "authenticated",
    });

    expect(redirectTarget(() => requireAuthenticated({ platformAdminOnly: true }))).toMatchObject({
      options: { to: "/company/dashboard" },
    });
  });

  it("admits a platform admin to a platformAdminOnly route", () => {
    const session = buildSession({ isPlatformAdmin: true });
    useAuthStore.setState({ session, status: "authenticated" });

    expect(requireAuthenticated({ platformAdminOnly: true })).toEqual(session);
  });
});

describe("admin console build flag", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("isAdminConsoleEnabled reflects VITE_ENABLE_ADMIN", () => {
    vi.stubEnv("VITE_ENABLE_ADMIN", "true");
    expect(isAdminConsoleEnabled()).toBe(true);

    vi.stubEnv("VITE_ENABLE_ADMIN", "false");
    expect(isAdminConsoleEnabled()).toBe(false);
  });

  it("requireAdminConsoleEnabled throws notFound when the flag is off", () => {
    vi.stubEnv("VITE_ENABLE_ADMIN", "false");

    expect(() => requireAdminConsoleEnabled()).toThrow();
  });

  it("requireAdminConsoleEnabled does not throw when the flag is on", () => {
    vi.stubEnv("VITE_ENABLE_ADMIN", "true");

    expect(() => requireAdminConsoleEnabled()).not.toThrow();
  });
});
