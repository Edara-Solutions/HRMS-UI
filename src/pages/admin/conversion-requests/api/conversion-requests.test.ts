import { describe, expect, it } from "vitest";
import { approvalInputSchema, rejectionInputSchema } from "./conversion-requests";

describe("conversion request decision validation", () => {
  it("accepts each approval preset", () => {
    for (const templateKey of [1, 2, 3] as const) {
      expect(approvalInputSchema.safeParse({ templateKey }).success).toBe(true);
    }
  });

  it("accepts a valid custom setup", () => {
    const result = approvalInputSchema.safeParse({
      templateKey: -1,
      setupSteps: [
        {
          stepType: "SET_COMPANY_PROFILE",
          isRequired: true,
          sequence: 1,
          dependencies: [],
        },
        {
          stepType: "SET_BRANCHES",
          isRequired: false,
          sequence: 2,
          dependencies: ["SET_COMPANY_PROFILE"],
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it.each([
    {
      name: "duplicate step types",
      setupSteps: [
        { stepType: "SET_ROLES", isRequired: true, sequence: 1, dependencies: [] },
        { stepType: "SET_ROLES", isRequired: false, sequence: 2, dependencies: [] },
      ],
    },
    {
      name: "duplicate sequences",
      setupSteps: [
        { stepType: "SET_ROLES", isRequired: true, sequence: 1, dependencies: [] },
        { stepType: "SET_JOBS", isRequired: false, sequence: 1, dependencies: [] },
      ],
    },
    {
      name: "non-positive sequences",
      setupSteps: [{ stepType: "SET_ROLES", isRequired: true, sequence: 0, dependencies: [] }],
    },
    {
      name: "unsupported dependencies",
      setupSteps: [
        { stepType: "SET_ROLES", isRequired: true, sequence: 1, dependencies: ["UNKNOWN"] },
      ],
    },
  ])("rejects $name", ({ setupSteps }) => {
    expect(approvalInputSchema.safeParse({ templateKey: -1, setupSteps }).success).toBe(false);
  });

  it("requires a timezone-qualified future trial end", () => {
    expect(
      approvalInputSchema.safeParse({ templateKey: 1, trialEndDate: "2999-01-01T00:00:00Z" })
        .success,
    ).toBe(true);
    expect(
      approvalInputSchema.safeParse({ templateKey: 1, trialEndDate: "2020-01-01T00:00:00Z" })
        .success,
    ).toBe(false);
    expect(
      approvalInputSchema.safeParse({ templateKey: 1, trialEndDate: "2999-01-01T00:00:00" })
        .success,
    ).toBe(false);
  });

  it("trims rejection reasons and rejects blank values", () => {
    expect(rejectionInputSchema.parse({ reason: "  Missing contact  " }).reason).toBe(
      "Missing contact",
    );
    expect(rejectionInputSchema.safeParse({ reason: "   " }).success).toBe(false);
  });
});
