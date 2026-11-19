import { describe, expect, it } from "vitest";
import { companyCommunicationsOperations as operations } from "@/shared/api";
import { emailTypesBody, variantsBody } from "../../../../test/company-communications-fixtures";
import { companyEmailTypes, eligibleVariants, previewLocale } from "./email-templates";

const types = operations.emailTypes.responses["200"].parse(emailTypesBody()).items;
const variants = operations.emailVariants.responses["200"].parse(variantsBody()).items;

describe("Company email eligibility", () => {
  it("never offers Edara-context types to the Company", () => {
    expect(companyEmailTypes(types).map((type) => type.key)).toEqual(["company.payslip-ready"]);
  });

  it("offers only Company variants rendering the type at its payload version", () => {
    const [payslip] = companyEmailTypes(types);
    expect(payslip && eligibleVariants(payslip, variants).map((variant) => variant.key)).toEqual([
      "payslip-ready.warm",
    ]);
  });

  it("previews in a supported locale, falling back to the type's first", () => {
    const invitation = types.find((type) => type.key === "edara.company-invitation");
    expect(invitation && previewLocale(invitation, "ar")).toBe("en");
  });
});
