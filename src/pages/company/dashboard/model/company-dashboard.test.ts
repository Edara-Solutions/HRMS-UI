import { describe, expect, it } from "vitest";
import { companyOrganizationOperations as operations } from "@/shared/api";
import {
  setupBody,
  setupStep,
  subscriptionBody,
} from "../../../../test/company-organization-fixtures";
import { summarizeSetup, trialDaysRemaining } from "./company-dashboard";

describe("dashboard setup summary", () => {
  it("counts skipped steps as resolved but required ones as remaining until completed", () => {
    const setup = operations.setup.responses["200"].parse(
      setupBody([
        setupStep("SET_COMPANY_PROFILE", "COMPLETED"),
        setupStep("SET_ROLES", "SKIPPED"),
        setupStep("SET_BRANCHES", "PENDING"),
      ]),
    );
    expect(summarizeSetup(setup)).toEqual({ resolved: 2, total: 3, requiredRemaining: 1 });
  });
});

describe("trial countdown", () => {
  const trial = operations.subscription.responses["200"].parse(subscriptionBody()).subscription;

  it("rounds partial days up and never goes negative", () => {
    expect(trialDaysRemaining(trial, new Date("2026-10-03T21:00:00.000Z"))).toBe(1);
    expect(trialDaysRemaining(trial, new Date("2026-10-10T00:00:00.000Z"))).toBe(0);
  });

  it("is absent for a non-trial subscription", () => {
    expect(trialDaysRemaining({ ...trial, status: "ACTIVE" })).toBeNull();
  });
});
