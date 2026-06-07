import { afterEach, describe, expect, it } from "vitest";
import { requireAuthenticated } from "./guards";
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
});
