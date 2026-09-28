import { describe, expect, it } from "vitest";
import { operation as plansOperation } from "./public/get-api-v1-public-plans";
import { operation as healthOperation } from "./public/get-health";
import { ContractViolation } from "./runtime";

describe("generated audience contracts", () => {
  it("keeps exact health statuses and validates each body", () => {
    expect(
      healthOperation.parseResponse(200, { ok: true, timestamp: "2026-09-26T12:00:00Z" }),
    ).toEqual({ ok: true, timestamp: "2026-09-26T12:00:00Z" });
    expect(healthOperation.parseResponse(503, { ok: false })).toEqual({ ok: false });
    expect(() => healthOperation.parseResponse(201, { ok: true })).toThrow(ContractViolation);
    expect(() => healthOperation.parseResponse(200, { ok: "yes" })).toThrow(ContractViolation);
  });

  it("accepts relative RFC URI references in declared problem responses", () => {
    expect(() =>
      plansOperation.parseResponse(400, {
        type: "/problems/invalid-market",
        title: "Invalid market",
        status: 400,
        detail: "Currency is required",
        instance: "/api/v1/public/plans",
        traceId: "0123456789abcdef0123456789abcdef",
      }),
    ).not.toThrow();
  });

  it("keeps violation messages bounded to provenance identifiers", () => {
    const forbidden = "forbidden-secret@example.com";
    let thrown: unknown;
    try {
      plansOperation.parseRequest({ query: { currencyCode: forbidden } });
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(ContractViolation);
    expect(String(thrown)).not.toContain(forbidden);
  });
});
