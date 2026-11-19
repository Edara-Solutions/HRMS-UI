import { describe, expect, it } from "vitest";
import { hasPermission } from "@/shared/auth";
import { companySessionFixture, platformSessionFixture } from "../../test/audience-fixtures";

const baseUser = companySessionFixture().user;

describe("hasPermission", () => {
  it("returns false for a user without the permission, not owner, not platform admin", () => {
    expect(hasPermission(baseUser, "users:read")).toBe(false);
  });

  it("returns true when the permission is in the user's permissions array", () => {
    expect(hasPermission({ ...baseUser, permissions: ["users:read"] }, "users:read")).toBe(true);
  });

  it("does not fabricate grants for a Company Owner", () => {
    expect(hasPermission(companySessionFixture({ isOwner: true }).user, "users:delete")).toBe(
      false,
    );
  });

  it("does not fabricate grants for a Platform role", () => {
    expect(
      hasPermission(
        platformSessionFixture({ roleNames: ["SUPER_ADMIN"] }).user,
        "companies:update",
      ),
    ).toBe(false);
  });

  it("returns false for a null/undefined user", () => {
    expect(hasPermission(null, "users:read")).toBe(false);
    expect(hasPermission(undefined, "users:read")).toBe(false);
  });
});
