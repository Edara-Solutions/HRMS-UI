import { describe, expect, it } from "vitest";
import {
  accessSessionBody,
  delegatedStepBody,
} from "../../../../test/platform-access-session-fixtures";
import { buildCorrection, toCorrectionForm } from "./employee-correction";
import { type AccessSession, canClose, sessionLiveness, workspaceSearchSchema } from "./session";
import { availableCommands } from "./setup";

function session(overrides: Record<string, unknown> = {}): AccessSession {
  const body = accessSessionBody(overrides);
  return {
    publicId: body.publicId,
    companyPublicId: body.companyPublicId,
    reason: "SUPPORT_REQUEST",
    status: body.status === "CLOSED" ? "CLOSED" : body.status === "EXPIRED" ? "EXPIRED" : "OPEN",
    openedAt: body.openedAt,
    expiresAt: body.expiresAt,
    closedAt: typeof body.closedAt === "string" ? body.closedAt : null,
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
    expect(workspaceSearchSchema.parse({ area: "roles" })).toEqual({ area: "roles" });
  });

  it("sends only edited correction fields and clears optional ones to null", () => {
    const values = {
      ...toCorrectionForm({
        publicId: "4b2d7c1e-9a8f-4e3d-8c2b-1a0f9e8d7c6b",
        employeeCode: "EMP-7",
        firstName: "Omar",
        lastName: "Said",
        email: "omar@example.test",
        phone: "0100",
        status: "ACTIVE",
        photoUrl: null,
        createdAt: "2026-09-20T09:00:00.000Z",
        updatedAt: "2026-09-20T09:00:00.000Z",
      }),
      phone: " ",
    };
    expect(buildCorrection(values, { phone: true })).toEqual({ phone: null });
    expect(buildCorrection(values, {})).toEqual({});
  });

  it("offers no transition for an unrecognized setup status", () => {
    expect(availableCommands(delegatedStepBody("PENDING"))).toEqual(["start", "skip"]);
    expect(availableCommands(delegatedStepBody("ARCHIVED"))).toEqual([]);
  });
});
