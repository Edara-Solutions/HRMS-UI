import { describe, expect, it } from "vitest";
import { type SetupStep, validSetup, validTrialEndDate } from "./setup";

const profile: SetupStep = {
  stepType: "SET_COMPANY_PROFILE",
  isRequired: true,
  sequence: 1,
  dependencies: [],
};
const roles: SetupStep = {
  stepType: "SET_ROLES",
  isRequired: false,
  sequence: 2,
  dependencies: ["SET_COMPANY_PROFILE"],
};
describe("Custom conversion setup prerequisites", () => {
  it("permits absent trial end and only valid future instants", () => {
    const now = Date.parse("2026-09-27T10:00:00Z");
    expect(validTrialEndDate(undefined, now)).toBe(true);
    expect(validTrialEndDate("2026-09-28T10:00:00Z", now)).toBe(true);
    expect(validTrialEndDate("2026-09-27T10:00:00Z", now)).toBe(false);
    expect(validTrialEndDate("invalid", now)).toBe(false);
  });
  it("permits a ordered dependency graph", () => expect(validSetup([profile, roles])).toBe(true));
  it.each(
    [
      [],
      [profile, profile],
      [profile, { ...roles, sequence: 1 }],
      [{ ...profile, sequence: 0 }],
      [{ ...profile, sequence: 1.5 }],
      [roles],
      [{ ...profile, dependencies: ["SET_ROLES"] }, roles],
      [{ ...profile, dependencies: ["SET_COMPANY_PROFILE"] }],
    ].map((steps) => ({ steps })),
  )("blocks incomplete, duplicated or cyclic setup: %j", ({ steps }) =>
    expect(validSetup(steps)).toBe(false));
});
