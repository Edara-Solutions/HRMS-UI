import { describe, expect, it } from "vitest";
import { accessSessionBody } from "../../../../test/platform-access-session-fixtures";
import { type AccessSession, canClose, sessionLiveness, workspaceSearchSchema } from "./session";

function session(overrides: Record<string, unknown> = {}): AccessSession {
  const body = accessSessionBody(overrides);
  return {
    ...body,
    reason: "SUPPORT_REQUEST",
    scope: "CHANGE",
    status: body.status === "CLOSED" ? "CLOSED" : body.status === "EXPIRED" ? "EXPIRED" : "OPEN",
    closedAt: typeof body.closedAt === "string" ? body.closedAt : null,
    endedBy: null,
    endNote: null,
  };
}

describe("Access Session model", () => {
  it("is live only while open and before its fixed expiry", () => {
    const now = Date.parse("2026-09-27T10:00:00.000Z");
    expect(sessionLiveness(session({ expiresAt: "2026-09-27T10:00:01.000Z" }), now)).toBe("live");
    expect(sessionLiveness(session({ expiresAt: "2026-09-27T10:00:00.000Z" }), now)).toBe(
      "inactive",
    );
    expect(sessionLiveness(session({ status: "CLOSED" }), now)).toBe("inactive");
  });

  it("offers close as cleanup until the session is closed", () => {
    expect(canClose(session({ status: "EXPIRED" }))).toBe(true);
    expect(canClose(session({ status: "CLOSED", closedAt: "2026-09-27T10:00:00.000Z" }))).toBe(
      false,
    );
  });

  it("drops an unknown area from the route search", () => {
    expect(workspaceSearchSchema.parse({ area: "credentials" })).toEqual({});
    expect(workspaceSearchSchema.parse({ area: "audit" })).toEqual({ area: "audit" });
  });
});
