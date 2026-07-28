import { describe, expect, it } from "vitest";
import { companyActivationSchema, companySetupChecklistSchema } from "./company-setup";

describe("company setup contract", () => {
  it("parses checklist snapshots with ordered step metadata", () => {
    const checklist = companySetupChecklistSchema.parse({
      companyPublicId: "company-1",
      templateVersion: 2,
      steps: [
        {
          publicId: "22222222-2222-4222-8222-222222222222",
          stepType: "SET_ROLES",
          status: "PENDING",
          isRequired: true,
          sequence: 2,
          templateVersion: 2,
          dependencies: ["SET_COMPANY_PROFILE"],
          startedAt: null,
          completedAt: null,
          createdAt: "2026-07-27T09:10:00.000Z",
          updatedAt: "2026-07-27T09:10:00.000Z",
        },
      ],
    });

    expect(checklist.steps[0].dependencies).toEqual(["SET_COMPANY_PROFILE"]);
    expect(checklist.templateVersion).toBe(2);
  });

  it("parses activation guidance with server lifecycle status", () => {
    const activation = companyActivationSchema.parse({
      companyPublicId: "company-1",
      lifecycleStatus: "ONBOARDING",
      activatedAt: null,
      canActivate: false,
      unmetRequirements: [
        {
          code: "COMPANY_PROFILE_INCOMPLETE",
          message: "Fill the profile first.",
          details: {},
        },
      ],
    });

    expect(activation.lifecycleStatus).toBe("ONBOARDING");
    expect(activation.unmetRequirements[0].code).toBe("COMPANY_PROFILE_INCOMPLETE");
  });
});
