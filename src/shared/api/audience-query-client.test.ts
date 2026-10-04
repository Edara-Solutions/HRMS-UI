import { describe, expect, it, vi } from "vitest";
import { companyQueryClient } from "./company-query-client";
import { ContractViolation } from "./generated/runtime";
import { platformQueryClient } from "./platform-query-client";

describe("audience query clients", () => {
  it("does not retry an invalid Company operation contract", async () => {
    const queryFn = vi.fn(async () => {
      throw new ContractViolation({
        audience: "company",
        key: "GET /api/v1/company/me",
        phase: "response",
        status: 200,
      });
    });
    await expect(
      companyQueryClient.fetchQuery({
        queryKey: ["company", "identity", "me"],
        queryFn,
        retryDelay: 0,
      }),
    ).rejects.toBeInstanceOf(ContractViolation);
    expect(queryFn).toHaveBeenCalledOnce();
    companyQueryClient.clear();
  });

  it("keeps equal resource keys isolated across audiences", () => {
    companyQueryClient.setQueryData(["profile"], { firstName: "Company reader" });
    platformQueryClient.setQueryData(["profile"], { firstName: "Platform reader" });
    companyQueryClient.clear();
    expect(platformQueryClient.getQueryData(["profile"])).toEqual({ firstName: "Platform reader" });
    platformQueryClient.clear();
  });
});
