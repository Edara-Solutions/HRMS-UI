import { describe, expect, it } from "vitest";
import { safeReturnDestination } from "./return-destination";

describe("audience return destination", () => {
  it("keeps a same-audience destination without credential-bearing search or fragment", () => {
    expect(safeReturnDestination("company", "/company/me/profile?token=secret#credential")).toBe(
      "/company/me/profile",
    );
  });

  it.each([
    "https://attacker.invalid/company/dashboard",
    "//attacker.invalid/company/dashboard",
    "/platform/dashboard",
    "/admin/dashboard",
    "/company/%2e%2e/platform/dashboard",
    "/company/../platform/dashboard",
    "/company/%252e%252e/platform/dashboard",
    "/company\\dashboard",
    "/company/login",
    "/company/accept-invitation",
    "/company/password-reset/confirm",
    "/company/change-password",
    "/company/%zz",
  ])("rejects unsafe or credential-completion destination %s", (destination) => {
    expect(safeReturnDestination("company", destination)).toBe("/company/dashboard");
  });

  it("uses the Platform fallback independently", () => {
    expect(safeReturnDestination("platform", "/company/dashboard")).toBe("/platform/dashboard");
    expect(safeReturnDestination("platform", "/platform/me/sessions")).toBe(
      "/platform/me/sessions",
    );
  });
});
