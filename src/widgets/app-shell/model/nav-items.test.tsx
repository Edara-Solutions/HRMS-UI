import { describe, expect, it } from "vitest";
import { adminNavGroups, companyNavGroups } from "./nav-items";

describe("Admin navigation", () => {
  it("exposes the Email Platform area", () => {
    expect(adminNavGroups.flatMap((group) => group.items)).toEqual(
      expect.arrayContaining([expect.objectContaining({ label: "Email", href: "/admin/email" })]),
    );
  });
});

describe("Company navigation", () => {
  it("reaches the Company Audit Trail", () => {
    expect(companyNavGroups.flatMap((group) => group.items)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Audit log", href: "/company/audit" }),
      ]),
    );
  });
});
