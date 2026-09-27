import { describe, expect, it } from "vitest";
import {
  confirmationMatches,
  projectActionAvailability,
  projectConfirmation,
  projectDenialResponse,
  projectNavigation,
  projectRouteAccess,
  routeDeclarations,
} from "./access-projections";

const company = {
  audience: "company",
  authenticated: true,
  permissions: [],
  companyMode: "NORMAL",
} as const;
const read = "GET /api/v1/company/users/{publicId}";
const write = "DELETE /api/v1/company/users/{publicId}";

describe("shared access projections", () => {
  it("fails closed for unknown write modes and unproved delegated ownership", () => {
    expect(
      projectActionAvailability(write, {
        ...company,
        companyMode: undefined,
        permissions: ["users:delete"],
      }),
    ).toEqual({ state: "disabled", reason: "access-unverified" });
    expect(
      projectActionAvailability("GET /api/v1/platform/access-sessions/{sessionPublicId}/users", {
        audience: "platform",
        authenticated: true,
        permissions: ["delegation:users:read"],
        accessSession: "inactive",
      }),
    ).toEqual({ state: "hidden" });
  });
  it.each([
    [{ self: true }, "self-target"],
    [{ protectedRoot: true }, "protected-root"],
    [{ finalRoot: true }, "final-root"],
    [{ systemRole: true }, "system-role"],
    [{ preservesOwner: false }, "owner-continuity"],
    [{ lifecycleAllowed: false }, "lifecycle"],
  ] as const)("projects validated target restrictions independently of permission", (target, reason) => {
    expect(
      projectActionAvailability(write, { ...company, permissions: ["users:delete"], target }),
    ).toEqual({ state: "disabled", reason });
    expect(projectActionAvailability(write, { ...company, target })).toEqual({ state: "hidden" });
  });
  it("requires explicit root/Owner prerequisites without synthesizing grants", () => {
    expect(
      projectActionAvailability(write, {
        ...company,
        permissions: ["users:delete"],
        requiresRoot: true,
      }),
    ).toEqual({ state: "disabled", reason: "prerequisite" });
    expect(
      projectActionAvailability(write, {
        ...company,
        permissions: ["users:delete"],
        requiresOwner: true,
      }),
    ).toEqual({ state: "disabled", reason: "prerequisite" });
  });
  it("requires exact typed target or explicit standard acknowledgement", () => {
    expect(
      confirmationMatches({ state: "enabled" }, "typed-target", "Company", "company", true),
    ).toBe(false);
    expect(
      confirmationMatches({ state: "enabled" }, "typed-target", "Company", "Company", false),
    ).toBe(true);
    expect(confirmationMatches({ state: "enabled" }, "standard", "Company", "", false)).toBe(false);
    expect(confirmationMatches({ state: "hidden" }, "none", "", "", true)).toBe(false);
  });
  it("keeps SELF available without business grants and uses the same navigation registry", () => {
    expect(projectRouteAccess("/company/me/profile", company)).toBe("allow");
    expect(projectNavigation(company).map((route) => route.path)).toContain("/company/me/profile");
    expect(routeDeclarations.every((route) => !route.path.includes("/admin"))).toBe(true);
  });
  it("conceals unknown, foreign, unsupported and disabled namespaces before authentication", () => {
    for (const path of [
      "/admin",
      "/company/users",
      "/platform/me/profile",
      "/company/account/profile",
    ]) {
      expect(projectRouteAccess(path, company)).toBe("not-found");
    }
    expect(projectRouteAccess("/platform/login", { platformEnabled: false })).toBe("not-found");
    expect(projectRouteAccess("/company/me/profile", {})).toBe("authenticate");
  });
  it("completes credentials only on a known protected route", () => {
    expect(
      projectRouteAccess("/company/me/profile", { ...company, mustChangePassword: true }),
    ).toBe("credential-completion");
    expect(projectRouteAccess("/unknown", { ...company, mustChangePassword: true })).toBe(
      "not-found",
    );
  });
  it("never treats root or Owner as an operation permission", () => {
    expect(projectActionAvailability(read, { ...company, root: true, owner: true })).toEqual({
      state: "hidden",
    });
    expect(projectActionAvailability(read, { ...company, permissions: ["users:read"] })).toEqual({
      state: "enabled",
    });
  });
  it.each([
    "READ_ONLY",
    "FROZEN",
    "MAINTENANCE",
  ] as const)("preserves reads and SELF but disables writes in %s", (companyMode) => {
    const facts = { ...company, companyMode, permissions: ["users:read", "users:delete"] };
    expect(projectActionAvailability(read, facts).state).toBe("enabled");
    expect(projectActionAvailability(write, facts)).toEqual({
      state: "disabled",
      reason: "restricted-mode",
    });
    expect(projectRouteAccess("/company/me/security", facts)).toBe("allow");
  });
  it("separates blocked Company, owned inactive access and concealed foreign access", () => {
    expect(projectRouteAccess("/company/dashboard", { ...company, companyMode: "BLOCKED" })).toBe(
      "company-blocked",
    );
    expect(projectRouteAccess("/company/me/profile", { ...company, companyMode: "BLOCKED" })).toBe(
      "allow",
    );
    const delegated = "GET /api/v1/platform/access-sessions/{sessionPublicId}/users";
    expect(
      projectActionAvailability(delegated, {
        audience: "platform",
        authenticated: true,
        permissions: ["delegation:users:read"],
        accessSession: "inactive",
        delegatedScopeMatches: true,
        delegatedGrant: true,
      }),
    ).toEqual({ state: "disabled", reason: "access-session-inactive" });
    expect(
      projectActionAvailability(delegated, {
        audience: "platform",
        authenticated: true,
        permissions: ["delegation:users:read"],
        accessSession: "foreign",
      }),
    ).toEqual({ state: "hidden" });
  });
  it.each([
    "self-target",
    "protected-root",
    "final-root",
    "system-role",
    "owner-continuity",
    "lifecycle",
    "prerequisite",
  ] as const)("keeps %s distinct from missing grants", (restriction) => {
    expect(
      projectActionAvailability(write, { ...company, permissions: ["users:delete"], restriction }),
    ).toEqual({ state: "disabled", reason: restriction });
  });
  it("projects confirmation and refusals without internal diagnostics", () => {
    expect(projectConfirmation({ state: "hidden" }, "typed-target")).toBe("none");
    expect(projectConfirmation({ state: "enabled" }, "standard")).toBe("standard");
    expect(projectConfirmation({ state: "enabled" }, "typed-target")).toBe("typed-target");
    expect(projectDenialResponse(404, "RAW_SECRET")).toBe("not-found");
    expect(projectDenialResponse(403, "ACCESS_SESSION_INACTIVE")).toBe("forbidden");
    expect(projectDenialResponse(403, "COMPANY_ACCESS_DENIED", "BLOCKED")).toBe("company-blocked");
    expect(projectDenialResponse(403, undefined, undefined, true)).toBe("access-session-inactive");
    expect(projectDenialResponse(401)).toBe("authenticate");
    expect(projectRouteAccess("/company/dashboard", company)).toBe("no-work-access");
  });
  it("routes the Company organization workflows by their generated read permission", () => {
    const worker = { ...company, permissions: ["users:read"] };
    expect(projectRouteAccess("/company/profile", worker)).toBe("forbidden");
    expect(projectRouteAccess("/company/setup", worker)).toBe("forbidden");
    expect(
      projectRouteAccess("/company/profile", {
        ...company,
        permissions: ["company-profiles:read"],
      }),
    ).toBe("allow");
    expect(
      projectRouteAccess("/company/setup", { ...company, permissions: ["company-setup:read"] }),
    ).toBe("allow");
    expect(
      projectRouteAccess("/company/setup", {
        ...company,
        companyMode: "BLOCKED",
        permissions: ["company-setup:read"],
      }),
    ).toBe("company-blocked");
    expect(
      projectRouteAccess("/platform/setup", { audience: "platform", authenticated: true }),
    ).toBe("not-found");
  });
  it("matches people and role detail routes only for well-formed public IDs", () => {
    const reader = { ...company, permissions: ["users:read", "roles:read"] };
    const id = "7b1d2c3e-4f5a-4b6c-8d7e-9f0a1b2c3d4e";
    expect(projectRouteAccess(`/company/people/${id}`, reader)).toBe("allow");
    expect(projectRouteAccess(`/company/roles/${id}`, reader)).toBe("allow");
    expect(projectRouteAccess("/company/people/internal-secret", reader)).toBe("not-found");
    expect(projectRouteAccess(`/company/people/${id}/extra`, reader)).toBe("not-found");
    expect(
      projectRouteAccess(`/company/people/${id}`, { ...company, permissions: ["roles:read"] }),
    ).toBe("forbidden");
    expect(projectRouteAccess("/company/roles", { ...company, permissions: ["users:read"] })).toBe(
      "forbidden",
    );
  });
});
