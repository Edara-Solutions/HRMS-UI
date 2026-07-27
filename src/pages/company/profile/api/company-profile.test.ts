import { describe, expect, it } from "vitest";
import { companyProfileSchema } from "./company-profile";

describe("company profile contract", () => {
  it("parses nullable optional fields and authoritative completion status", () => {
    const profile = companyProfileSchema.parse({
      publicId: "profile-1",
      companyPublicId: "company-1",
      name: "Northwind Egypt",
      logoUrl: null,
      email: null,
      phone: null,
      country: "EG",
      city: null,
      addressLine: null,
      taxNumber: null,
      commercialNumber: null,
      status: "INCOMPLETE",
      createdAt: "2026-07-27T09:00:00.000Z",
      updatedAt: "2026-07-27T09:00:00.000Z",
    });

    expect(profile.status).toBe("INCOMPLETE");
    expect(profile.logoUrl).toBeNull();
  });
});
