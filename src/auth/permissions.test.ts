import { describe, expect, it } from "vitest";
import { hasPermission } from "./permissions";
import type { SessionUser } from "./types";

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

describe("hasPermission", () => {
  it("returns false for a user without the permission, not owner, not platform admin", () => {
    expect(hasPermission(baseUser, "users:read")).toBe(false);
  });

  it("returns true when the permission is in the user's permissions array", () => {
    expect(hasPermission({ ...baseUser, permissions: ["users:read"] }, "users:read")).toBe(true);
  });

  it("short-circuits to true for a tenant owner regardless of the permissions array", () => {
    expect(hasPermission({ ...baseUser, isOwner: true }, "users:delete")).toBe(true);
  });

  it("short-circuits to true for a platform admin regardless of the permissions array", () => {
    expect(hasPermission({ ...baseUser, isPlatformAdmin: true }, "companies:update")).toBe(true);
  });

  it("returns false for a null/undefined user", () => {
    expect(hasPermission(null, "users:read")).toBe(false);
    expect(hasPermission(undefined, "users:read")).toBe(false);
  });
});
