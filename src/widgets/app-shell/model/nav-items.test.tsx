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
  it("localizes the same registry without synthesizing Owner grants", () => {
    const facts = { audience: "company", authenticated: true, owner: true } as const;
    expect(buildNavGroups(facts, "ar")[0]?.items[1]?.label).toBe("ملفي الشخصي");
    expect(
      buildNavGroups(facts, "en")
        .flatMap((group) => group.items)
        .some((item) => item.href.includes("users")),
    ).toBe(false);
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
});
