import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CompanySession, PlatformSession } from "@/shared/auth";
import { useCompanySession, usePlatformSession } from "@/shared/auth";
import {
  isPlatformPortalEnabled,
  redirectIfMustChangePassword,
  requireAuthenticated,
  requirePlatformPortalEnabled,
} from "./auth-guards";

const tokens = {
  accessToken: "access",
  refreshToken: "refresh",
  sessionId: "b2b0369d-e6f3-4b8a-aa86-8c6053b19b19",
  expiresIn: 900,
  mustChangePassword: false,
};
const identity = {
  publicId: "cdebc050-5b45-4c15-a199-44ce6a4161ba",
  firstName: "Jane",
  lastName: "Doe",
  email: "jane@example.com",
  mustChangePassword: false,
  photoUrl: null,
  locale: "en",
  timezone: "UTC",
  permissions: [],
};
const company: CompanySession = {
  ...tokens,
  user: {
    ...identity,
    status: "ACTIVE",
    employeeCode: "EMP-001",
    companyCode: "ACME",
    companyPublicId: "379dd5ae-49e0-4bbe-90b9-1125f0802729",
    isOwner: false,
  },
};
const platform: PlatformSession = {
  ...tokens,
  user: { ...identity, status: "ACTIVE", roleNames: [] },
};

afterEach(() => {
  useCompanySession.getState().clearSession();
  usePlatformSession.getState().clearSession();
  vi.unstubAllEnvs();
});

describe("audience route guard", () => {
  beforeEach(() => vi.stubEnv("VITE_ENABLE_PLATFORM_PORTAL", "true"));
  it("requires Company authentication even when Platform is signed in", async () => {
    usePlatformSession.getState().setSession(platform);
    await expect(requireAuthenticated()).rejects.toMatchObject({
      options: { to: "/company/login" },
    });
  });

  it("requires Platform authentication even when the Company Owner is signed in", async () => {
    useCompanySession
      .getState()
      .setSession({ ...company, user: { ...company.user, isOwner: true } });
    await expect(requireAuthenticated({ audience: "platform" })).rejects.toMatchObject({
      options: { to: "/platform/login" },
    });
  });

  it("admits only the route's matching established identity", async () => {
    useCompanySession.getState().setSession(company);
    usePlatformSession.getState().setSession(platform);
    await expect(requireAuthenticated()).resolves.toEqual(company);
    await expect(requireAuthenticated({ audience: "platform" })).resolves.toEqual(platform);
  });

  it("does not let Company password completion block the Platform identity", async () => {
    useCompanySession
      .getState()
      .setSession({ ...company, user: { ...company.user, mustChangePassword: true } });
    usePlatformSession.getState().setSession(platform);
    await expect(requireAuthenticated()).rejects.toMatchObject({
      options: { to: "/company/change-password" },
    });
    await expect(requireAuthenticated({ audience: "platform" })).resolves.toEqual(platform);
    expect(() => redirectIfMustChangePassword("/platform/dashboard")).not.toThrow();
    expect(() => redirectIfMustChangePassword("/plans")).not.toThrow();
  });

  it("refuses a known Company route without its required permission", async () => {
    useCompanySession.getState().setSession(company);
    await expect(
      requireAuthenticated({ requiredPermissions: ["users:read"] }),
    ).rejects.toMatchObject({ options: { to: "/forbidden" } });
  });
});

describe("admin console build flag", () => {
  it("conceals absent-build routes", () => {
    vi.stubEnv("VITE_ENABLE_PLATFORM_PORTAL", "false");
    expect(isPlatformPortalEnabled()).toBe(false);
    expect(() => requirePlatformPortalEnabled()).toThrow();
  });
  it("permits enabled-build routes to proceed to their audience guard", () => {
    vi.stubEnv("VITE_ENABLE_PLATFORM_PORTAL", "true");
    expect(isPlatformPortalEnabled()).toBe(true);
    expect(() => requirePlatformPortalEnabled()).not.toThrow();
  });
});
