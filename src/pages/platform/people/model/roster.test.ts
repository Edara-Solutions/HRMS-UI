import { describe, expect, it } from "vitest";
import { buildInvitation, rosterSearchSchema } from "./roster";

const values = {
  firstName: "Omar",
  lastName: "Nabil",
  email: "omar@edara.test",
  staffCode: "",
  jobTitle: "Support lead",
  team: "",
};
const role = "7c6d5e4f-3a2b-4c1d-8e9f-0a1b2c3d4e5f";

describe("Platform invitation", () => {
  it("omits roles when the actor may not assign them", () => {
    expect(buildInvitation(values, [role], false)).toEqual({
      firstName: "Omar",
      lastName: "Nabil",
      email: "omar@edara.test",
      jobTitle: "Support lead",
    });
  });

  it("sends chosen roles only for an actor who may assign them", () => {
    expect(buildInvitation(values, [role], true).rolePublicIds).toEqual([role]);
    expect(buildInvitation(values, [], true)).not.toHaveProperty("rolePublicIds");
  });
});

describe("Platform roster search", () => {
  it("falls back instead of failing on an invalid page", () => {
    expect(rosterSearchSchema.parse({ page: "0" })).toEqual({ page: undefined });
    expect(rosterSearchSchema.parse({ page: "3" })).toEqual({ page: 3 });
  });
});
