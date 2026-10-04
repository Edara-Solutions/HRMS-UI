import { afterEach, describe, expect, it, vi } from "vitest";
import { ContractViolation, platformCommunicationsOperations as operations } from "@/shared/api";
import { usePlatformSession } from "@/shared/auth";
import { problemBody } from "../../../../test/operation-fakes";
import { operationNetwork } from "../../../../test/operation-request-mock";
import { isPlatformEventType, platformAuditEventTypes, toQuery } from "./audit";

vi.mock("@/shared/api/operation-request", async (original) => {
  const actual =
    await original<
      Pick<typeof import("@/shared/api"), "executeOperationRequest" | "OperationRefusal">
    >();
  return {
    ...actual,
    executeOperationRequest: (client: never, operation: never, input: unknown) =>
      operationNetwork.current.execute(client, operation, input, actual.OperationRefusal),
  };
});
afterEach(() => usePlatformSession.getState().clearSession());

describe("platformAuditEventTypes and isPlatformEventType", () => {
  it("derives every declared event type from the generated request schema", () => {
    expect(platformAuditEventTypes.length).toBeGreaterThan(50);
    expect(platformAuditEventTypes).toContain("audit.trail.platform_read");
    expect(platformAuditEventTypes).toContain("privacy.identity.erased");
    expect(platformAuditEventTypes).toContain("company.lifecycle.created");
    expect(platformAuditEventTypes).toContain("auth.session.started");
    expect(platformAuditEventTypes).not.toContain("audit.event.unavailable");
    expect(platformAuditEventTypes).not.toContain("not.an.event");
  });

  it("accepts exactly the declared literals and rejects unknown strings", () => {
    expect(isPlatformEventType("audit.trail.platform_read")).toBe(true);
    expect(isPlatformEventType("company.lifecycle.created")).toBe(true);
    expect(isPlatformEventType("not.an.event")).toBe(false);
  });
});

describe("toQuery", () => {
  it("passes through cursor, limit, date range, actor, outcome, scope, company, trace", () => {
    const params = {
      cursor: "opaque-cursor",
      limit: 25,
      occurredFrom: "2026-01-01T00:00:00.000Z",
      occurredTo: "2026-12-31T23:59:59.999Z",
      actorPublicId: "550e8400-e29b-41d4-a716-446655440000",
      outcome: "FAILURE" as const,
      scope: "PLATFORM" as const,
      companyPublicId: "ace09ed2-c5bd-4474-bac9-78a7bb659da3",
      traceId: "5fc21e3361b0fe234353b1176c5b2fdf",
      eventType: ["audit.trail.platform_read", "company.lifecycle.created"],
    };
    const query = toQuery(params);
    expect(query).toEqual({
      cursor: "opaque-cursor",
      limit: 25,
      occurredFrom: "2026-01-01T00:00:00.000Z",
      occurredTo: "2026-12-31T23:59:59.999Z",
      actorPublicId: "550e8400-e29b-41d4-a716-446655440000",
      outcome: "FAILURE",
      eventType: ["audit.trail.platform_read", "company.lifecycle.created"],
      companyPublicId: "ace09ed2-c5bd-4474-bac9-78a7bb659da3",
      traceId: "5fc21e3361b0fe234353b1176c5b2fdf",
      scope: "PLATFORM",
    });
  });

  it("filters out undeclared event types instead of sending them", () => {
    const params = {
      eventType: ["audit.trail.platform_read", "not.an.event", "company.lifecycle.created"],
    };
    const query = toQuery(params);
    expect(query.eventType).toEqual(["audit.trail.platform_read", "company.lifecycle.created"]);
  });

  it("omits eventType when all values are filtered out", () => {
    const params = { eventType: ["not.an.event"] };
    const query = toQuery(params);
    expect(query.eventType).toBeUndefined();
  });
});

describe("auditTrail contract ownership", () => {
  const auditTrailOp = operations.auditTrail;
  const auditActorsOp = operations.auditActors;

  it("pins auditTrail to its declared contracts (platform audience, request/response round-trip, undeclared status → ContractViolation, malformed body → ContractViolation)", () => {
    expect(auditTrailOp.audience).toBe("platform");
    const validInput = { query: { limit: 50, eventType: ["audit.trail.platform_read"] } };
    expect(auditTrailOp.parseRequest(validInput)).toEqual(validInput);
    for (const failure of [400, 401, 403]) {
      expect(auditTrailOp.parseResponse(failure, problemBody(failure))).toMatchObject({
        status: failure,
      });
    }
    expect(() => auditTrailOp.parseResponse(200, { secret: "response-canary" })).toThrow(
      ContractViolation,
    );
    expect(() => auditTrailOp.parseResponse(429, problemBody(429))).toThrow(ContractViolation);
  });

  it("pins auditActors to its declared contracts", () => {
    expect(auditActorsOp.audience).toBe("platform");
    const validInput = { query: { query: "nadia" } };
    expect(auditActorsOp.parseRequest(validInput)).toEqual(validInput);
    const validBody = [
      {
        publicId: "550e8400-e29b-41d4-a716-446655440000",
        kind: "PLATFORM_USER" as const,
        name: "Nadia",
      },
      { publicId: "550e8400-e29b-41d4-a716-446655440001", kind: "USER" as const, name: "Sara" },
    ];
    expect(auditActorsOp.parseResponse(200, validBody)).toEqual(validBody);
    for (const failure of [400, 401, 403]) {
      expect(auditActorsOp.parseResponse(failure, problemBody(failure))).toMatchObject({
        status: failure,
      });
    }
    expect(() => auditActorsOp.parseResponse(200, { secret: "response-canary" })).toThrow(
      ContractViolation,
    );
    expect(() => auditActorsOp.parseResponse(429, problemBody(429))).toThrow(ContractViolation);
  });
});

describe("cache-key variation", () => {
  it("keys identity, operation and explicit filters without credentials", () => {
    const query = { limit: 50, scope: "PLATFORM" as const };
    const first = ["platform", "operator-a", operations.auditTrail.key, JSON.stringify(query)];
    expect(first).toEqual([
      "platform",
      "operator-a",
      operations.auditTrail.key,
      JSON.stringify(query),
    ]);
    expect(first).not.toEqual([
      "platform",
      "operator-b",
      operations.auditTrail.key,
      JSON.stringify(query),
    ]);
    expect(first).not.toEqual([
      "platform",
      "operator-a",
      operations.auditTrail.key,
      JSON.stringify({ ...query, scope: "COMPANY" }),
    ]);
    expect(first).not.toEqual([
      "platform",
      "operator-a",
      operations.auditTrail.key,
      JSON.stringify({ ...query, companyPublicId: "ace09ed2-c5bd-4474-bac9-78a7bb659da3" }),
    ]);
    expect(first).not.toEqual([
      "platform",
      "operator-a",
      operations.auditTrail.key,
      JSON.stringify({ ...query, traceId: "5fc21e3361b0fe234353b1176c5b2fdf" }),
    ]);
  });
});
