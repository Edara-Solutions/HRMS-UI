import { afterEach, describe, expect, it } from "vitest";
import type { AuthSession, SessionUser } from "@/shared/auth";
import { useAuthStore } from "@/shared/auth";
import { parseAdminEmailSearch, requireEmailPlatformRouteAccess } from "./index";

const BASE_USER: SessionUser = {
  publicId: "user-1",
  employeeCode: "ADMIN-001",
  firstName: "Nadia",
  lastName: "Hassan",
  email: "nadia@example.com",
  status: "ACTIVE",
  companyCode: "EDARA",
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
    user: { ...BASE_USER, ...userOverrides },
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

describe("Admin Email Platform route", () => {
  afterEach(() => {
    useAuthStore.setState({ session: null, status: "anonymous" });
  });

  it("redirects an unauthenticated visitor to login", () => {
    useAuthStore.setState({ session: null, status: "anonymous" });

    expect(redirectTarget(requireEmailPlatformRouteAccess)).toMatchObject({
      options: { to: "/login" },
    });
  });

  it("keeps Company users out through the existing Platform Admin guard", () => {
    useAuthStore.setState({
      session: buildSession({ isPlatformAdmin: false }),
      status: "authenticated",
    });

    expect(redirectTarget(requireEmailPlatformRouteAccess)).toMatchObject({
      options: { to: "/company/dashboard" },
    });
  });

  it("admits a Platform Admin", () => {
    const session = buildSession({ isPlatformAdmin: true });
    useAuthStore.setState({ session, status: "authenticated" });

    expect(requireEmailPlatformRouteAccess()).toEqual(session);
  });

  it("sanitizes invalid shareable search state to safe defaults", () => {
    expect(
      parseAdminEmailSearch({
        context: "UNKNOWN",
        emailTypeKey: "  owner-invitation  ",
        locale: "fr",
        view: "source",
      }),
    ).toEqual({
      context: "ALL",
      emailTypeKey: "owner-invitation",
      locale: "en",
      view: "html",
    });
  });
});
