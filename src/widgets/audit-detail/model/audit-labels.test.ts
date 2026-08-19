import { describe, expect, it } from "vitest";
import { auditNamespace } from "@/features/audit-filters";
import { i18next } from "@/shared/i18n";
import { auditEnumLabel, auditFieldLabel, isAuditEnumField } from "./audit-labels";

const t = i18next.getFixedT("en", auditNamespace);

describe("audit labels", () => {
  it("reads a payload field's authored label", () => {
    expect(auditFieldLabel(t, "taxNumber")).toBe("Tax number");
  });

  it("names the fields the contract closes to a fixed set of values", () => {
    expect(isAuditEnumField("status")).toBe(true);
    // `field` carries the names of changed fields, not enum values.
    expect(isAuditEnumField("field")).toBe(false);
  });

  it("derives an enum value from its token", () => {
    expect(auditEnumLabel(t, "status", "IN_PROGRESS")).toBe("In progress");
  });

  it("derives a lowercase enum value too", () => {
    expect(auditEnumLabel(t, "operation", "onboarding")).toBe("Onboarding");
  });

  it("prefers an authored override where the derived form misleads", () => {
    expect(auditEnumLabel(t, "stepType", "SET_COMPANY_PROFILE")).toBe("Company profile");
  });

  it("still reads as words for a value the contract adds later", () => {
    expect(auditEnumLabel(t, "status", "AWAITING_REVIEW")).toBe("Awaiting review");
  });
});
