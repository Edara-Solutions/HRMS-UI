import { describe, expect, it } from "vitest";
import { generatedRefusalModes } from "./generated/authorization";
import { ContractViolation } from "./generated/runtime";
import { classifyMutationFailure } from "./mutation-outcome";
import { OperationRefusal } from "./operation-request";

const operation = {
  audience: "company" as const,
  key: "PATCH /api/v1/company/profile",
  parseResponse: () => undefined,
};

function refusal(status: number, problem: Record<string, unknown> = {}) {
  return new OperationRefusal(operation, status, { detail: "raw-canary", ...problem });
}

describe("mutation outcome classification", () => {
  it.each(generatedRefusalModes)("maps a validated %s access denial to its mode", (mode) => {
    expect(classifyMutationFailure(refusal(403, { code: "COMPANY_ACCESS_DENIED", mode }))).toEqual({
      kind: "access-restricted",
      mode,
    });
  });

  it("maps declared 400 field paths to field names and never carries backend text", () => {
    const outcome = classifyMutationFailure(refusal(400, { invalidParams: ["/email", "/name"] }));
    expect(outcome).toEqual({ kind: "invalid", fields: ["email", "name"] });
    expect(JSON.stringify(outcome)).not.toContain("raw-canary");
  });

  it("keeps a 403 refusal, stale conflicts and ambiguous failures distinct", () => {
    expect(classifyMutationFailure(refusal(403))).toEqual({ kind: "refused" });
    for (const status of [404, 409, 412, 422])
      expect(classifyMutationFailure(refusal(status))).toEqual({ kind: "stale" });
    expect(classifyMutationFailure(refusal(503))).toEqual({ kind: "uncertain" });
    expect(classifyMutationFailure(new TypeError("Failed to fetch"))).toEqual({
      kind: "uncertain",
    });
  });

  it("treats a malformed contract as its own outcome", () => {
    expect(
      classifyMutationFailure(
        new ContractViolation({ audience: "company", key: operation.key, phase: "response" }),
      ),
    ).toEqual({ kind: "contract" });
  });

  it("treats an undeclared server failure status as an unknown effect, not a contract fault", () => {
    expect(
      classifyMutationFailure(
        new ContractViolation({
          audience: "company",
          key: operation.key,
          phase: "status",
          status: 503,
        }),
      ),
    ).toEqual({ kind: "uncertain" });
  });
});
