import { describe, expect, it } from "vitest";
import { retiredSurfaceViolations } from "./check-retired-surface.mjs";

describe("retired surface regression gate", () => {
  it.each([
    "isPlatformAdmin",
    "platformAdminOnly",
    "VITE_ENABLE_ADMIN_CONSOLE",
    "hrms-auth",
    "hrms-prefs",
    "apiClient",
    "/admin/users",
    "/api/v1/auth/login",
    "/api/v1/users",
    "PLATFORM_ADMIN",
    "platform_admin.new_identity",
  ])("rejects %s", (marker) => {
    expect(
      retiredSurfaceViolations(
        "src/pages/company/users/api/users.ts",
        `const value = "${marker}";`,
      ),
    ).not.toEqual([]);
  });
  it("allows ordinary administrator copy and current audience routes", () => {
    expect(
      retiredSurfaceViolations(
        "src/pages/company/users/ui/page.tsx",
        '"Company administrator"; "/api/v1/company/auth/login"; "/api/v1/platform/users";',
      ),
    ).toEqual([]);
  });
  it("rejects a relative generic client call as well as an absolute retired endpoint", () => {
    expect(
      retiredSurfaceViolations("src/pages/platform/users/api/users.ts", 'client.get("users");'),
    ).not.toEqual([]);
  });
  it("allows only reviewed backend event literals in their wire artifact", () => {
    const source = 'eventType: "platform_admin.session.started"';
    expect(
      retiredSurfaceViolations("src/shared/audit-catalog/audit-event-catalog.ts", source),
    ).toEqual([]);
    expect(retiredSurfaceViolations("src/pages/platform/users/api/users.ts", source)).not.toEqual(
      [],
    );
    expect(
      retiredSurfaceViolations(
        "src/shared/audit-catalog/audit-event-catalog.ts",
        'eventType: "platform_admin.other"',
      ),
    ).not.toEqual([]);
  });
  it("keeps route canaries narrow enough to reject new executable uses in the same file", () => {
    const path = "src/shared/auth/return-destination.test.ts";
    expect(retiredSurfaceViolations(path, '"/admin/dashboard",')).toEqual([]);
    expect(retiredSurfaceViolations(path, 'navigate("/admin/dashboard");')).not.toEqual([]);
  });
});
