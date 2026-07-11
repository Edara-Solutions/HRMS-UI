import { describe, expect, it } from "vitest";
import { adminNavGroups } from "./nav-items";

describe("Admin navigation", () => {
  it("exposes the Email Platform area", () => {
    expect(adminNavGroups.flatMap((group) => group.items)).toEqual(
      expect.arrayContaining([expect.objectContaining({ label: "Email", href: "/admin/email" })]),
    );
  });
});
