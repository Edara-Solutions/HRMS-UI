import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { platformSessionFixture } from "../../test/audience-fixtures";
import { usePlatformSession } from "../auth/platform-session";
import { usePlatformAccess } from "./platform-access";

function accessFor(roleNames: string[], permissions: string[]) {
  usePlatformSession.getState().setSession(platformSessionFixture({ roleNames, permissions }));
  return renderHook(() => usePlatformAccess()).result.current;
}

afterEach(() => usePlatformSession.getState().clearSession());

describe("Platform access", () => {
  it("requires current root standing for reserved authority operations", () => {
    const assign = "POST /api/v1/platform/role-assignments";
    expect(accessFor(["Support"], ["platform-roles:assign"]).availability(assign)).toEqual({
      state: "disabled",
      reason: "prerequisite",
    });
    expect(accessFor(["SUPER_ADMIN"], ["platform-roles:assign"]).availability(assign)).toEqual({
      state: "enabled",
    });
  });

  it("never lets the root role name stand in for a permission", () => {
    expect(
      accessFor(["SUPER_ADMIN"], []).availability("DELETE /api/v1/platform/roles/{rolePublicId}"),
    ).toEqual({ state: "hidden" });
  });

  it("does not add the root prerequisite to ordinary roster operations", () => {
    expect(
      accessFor(["Support"], ["platform-users:suspend"]).availability(
        "POST /api/v1/platform/users/{publicId}/suspend",
      ),
    ).toEqual({ state: "enabled" });
  });
});
