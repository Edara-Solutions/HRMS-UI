import { describe, expect, it } from "vitest";
import { buildNavGroups } from "./nav-items";

const company = (permissions: string[], owner = false) =>
  ({ audience: "company", authenticated: true, permissions, owner }) as const;
const platform = (permissions: string[]) =>
  ({ audience: "platform", authenticated: true, permissions }) as const;
const outline = (groups: ReturnType<typeof buildNavGroups>) =>
  groups.map((group) => [group.title, group.items.map((item) => item.label)]);

describe("sidebar group map", () => {
  it.each([
    "company",
    "platform",
  ] as const)("keeps %s me-pages out of the sidebar and hides empty groups", (audience) => {
    const groups = buildNavGroups({ audience, authenticated: true, permissions: [] }, "en");
    expect(outline(groups)).toEqual([["Overview", ["Dashboard"]]]);
  });

  it("places the Owner's Company workflows in the agreed groups with dev labels", () => {
    expect(outline(buildNavGroups(company([], true), "en"))).toEqual([
      ["Overview", ["Dashboard", "Company profile", "Setup checklist"]],
      ["Workforce", ["People", "Roles"]],
      ["Operations", ["Email settings", "Notification routing", "Audit Log"]],
    ]);
  });

  it("keeps permission filtering per entry", () => {
    expect(outline(buildNavGroups(company(["roles:read", "audit-events:read"]), "ar"))).toEqual([
      ["نظرة عامة", ["لوحة التحكم"]],
      ["القوى العاملة", ["الأدوار"]],
      ["العمليات", ["سجل التدقيق"]],
    ]);
  });

  it("lays out the full Platform map for a broad operator", () => {
    const groups = buildNavGroups(
      platform([
        "companies:read",
        "company-subscriptions:read",
        "leads:read",
        "plans:read",
        "lead-conversion-requests:read",
        "platform-users:read",
        "platform-roles:read",
        "announcements:read",
        "notification-settings",
        "email-types:read",
        "emails:delivery:list",
        "emails:sending:read",
        "audit-events:read",
      ]),
      "en",
    );
    expect(outline(groups)).toEqual([
      ["Overview", ["Dashboard"]],
      ["Management", ["Companies", "Subscriptions", "Leads", "Plans"]],
      ["Requests", ["Conversion requests"]],
      ["People & access", ["Platform people", "Platform roles"]],
      [
        "Communications",
        [
          "Announcements",
          "Notifications",
          "Email templates",
          "Email deliveries",
          "Sending controls",
        ],
      ],
      ["System", ["Audit Log"]],
    ]);
    expect(groups.flatMap((group) => group.items).every((item) => !item.href.includes("$"))).toBe(
      true,
    );
  });

  it("adds non-interactive Soon entries only when the switch is on", () => {
    const off = buildNavGroups(company([]), "en");
    const on = buildNavGroups(company([]), "en", { showUpcoming: true });
    expect(off.flatMap((group) => group.items).some((item) => item.upcoming)).toBe(false);
    expect(outline(on)).toEqual([
      ["Overview", ["Dashboard"]],
      ["Workforce", ["Org Chart", "Time Off", "Attendance"]],
      ["Finance", ["Payroll"]],
      ["Talent", ["Recruitment", "Onboarding", "Performance"]],
      ["Operations", ["Documents", "Approvals", "Reports"]],
    ]);
  });

  it("badges counts above zero and marks pending requests for attention", () => {
    const items = buildNavGroups(
      platform(["companies:read", "leads:read", "lead-conversion-requests:read"]),
      "en",
      { counts: { companies: 12, leads: 0, "conversion-requests": 3 } },
    ).flatMap((group) => group.items);
    const indicator = (path: string) =>
      items.find((item) => item.href === `/platform/${path}`)?.indicator;
    expect(indicator("companies")).toEqual({ count: 12, attention: false });
    expect(indicator("leads")).toBeUndefined();
    expect(indicator("conversion-requests")).toEqual({ count: 3, attention: true });
  });

  it("never badges an entry the caller cannot open", () => {
    const items = buildNavGroups(company([]), "en", { counts: { people: 9 } }).flatMap(
      (group) => group.items,
    );
    expect(items.some((item) => item.indicator)).toBe(false);
  });
});
