import { Home } from "lucide-react";
import { isValidElement } from "react";
import { describe, expect, it } from "vitest";
import { buildNavGroups } from "./nav-items";

describe("owned workflow navigation", () => {
  it.each([
    "company",
    "platform",
  ] as const)("shows only migrated %s workflows without fixture badges", (audience) => {
    const items = buildNavGroups({ audience, authenticated: true, permissions: [] }, "en").flatMap(
      (group) => group.items,
    );
    expect(items.map((item) => item.href)).toEqual([
      `/${audience}/dashboard`,
      `/${audience}/me/profile`,
      `/${audience}/me/security`,
      `/${audience}/me/sessions`,
    ]);
    expect(items.every((item) => !("indicator" in item))).toBe(true);
  });
  it("shows the backend Owner's Company workflows with localized labels", () => {
    const facts = { audience: "company", authenticated: true, owner: true } as const;
    expect(buildNavGroups(facts, "ar")[0]?.items[1]?.label).toBe("ملف المؤسسة");
    expect(
      buildNavGroups(facts, "en")
        .flatMap((group) => group.items)
        .some((item) => item.href === "/company/profile"),
    ).toBe(true);
  });
  it("adds the organization workflows only when their reads are granted", () => {
    const items = buildNavGroups(
      {
        audience: "company",
        authenticated: true,
        permissions: ["company-profiles:read", "company-setup:read"],
      },
      "en",
    ).flatMap((group) => group.items);
    expect(items.map((item) => [item.href, item.label])).toEqual([
      ["/company/dashboard", "Home"],
      ["/company/profile", "Organization profile"],
      ["/company/setup", "Company setup"],
      ["/company/me/profile", "My profile"],
      ["/company/me/security", "Security"],
      ["/company/me/sessions", "My sessions"],
    ]);
  });
  it("lists People and Roles, never their detail routes", () => {
    const hrefs = buildNavGroups(
      { audience: "company", authenticated: true, permissions: ["users:read", "roles:read"] },
      "ar",
    )
      .flatMap((group) => group.items)
      .map((item) => [item.href, item.label]);
    expect(hrefs).toContainEqual(["/company/people", "الأفراد"]);
    expect(hrefs).toContainEqual(["/company/roles", "الأدوار"]);
    expect(hrefs.some(([href]) => href?.includes("$"))).toBe(false);
  });
  it("gives platform workflows distinct icons instead of the Home fallback", () => {
    const items = buildNavGroups(
      {
        audience: "platform",
        authenticated: true,
        permissions: [
          "plans:read",
          "leads:read",
          "companies:read",
          "lead-conversion-requests:read",
        ],
      },
      "en",
    ).flatMap((group) => group.items);
    for (const path of ["plans", "leads", "companies", "conversion-requests"]) {
      const icon = items.find((item) => item.href === `/platform/${path}`)?.icon;
      expect(isValidElement(icon), path).toBe(true);
      if (isValidElement(icon)) expect(icon.type, path).not.toBe(Home);
    }
  });
});
