import { describe, expect, it } from "vitest";
import { grantableActions, grantChange, groupGrants, replacementActions } from "./grants";

describe("Platform role grants", () => {
  it("never offers a root-reserved or Company action", () => {
    const actions = grantableActions();
    expect(actions).toContain("platform-users:invite");
    expect(actions).toContain("platform-roles:read");
    for (const reserved of [
      "platform-roles:create",
      "platform-roles:update",
      "platform-roles:delete",
      "platform-roles:assign",
    ])
      expect(actions).not.toContain(reserved);
    expect(actions).not.toContain("users:read");
  });

  it("keeps a held action the contract no longer lists", () => {
    const replacement = replacementActions(
      ["retired:action", "leads:read"],
      new Set(["plans:read"]),
      ["leads:read", "plans:read"],
    );
    expect(replacement).toEqual(["retired:action", "plans:read"]);
    expect(grantChange(["retired:action", "leads:read"], replacement)).toEqual({
      added: 1,
      removed: 1,
    });
  });

  it("groups actions by resource", () => {
    expect(groupGrants(["leads:read", "leads:update", "plans:read"])).toEqual([
      { resource: "leads", actions: ["leads:read", "leads:update"] },
      { resource: "plans", actions: ["plans:read"] },
    ]);
  });
});
