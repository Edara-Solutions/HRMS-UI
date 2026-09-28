import { describe, expect, it } from "vitest";
import {
  ContractViolation,
  OperationRefusal,
  delegatedCompanyOperations as operations,
} from "@/shared/api";
import { problemBody } from "../../../../test/operation-fakes";
import { diagnosticFailure, receiptMatches, replayAllowed } from "./email-diagnostics";

const command = {
  requestId: "77777777-7777-4777-8777-777777777777",
  emailTypeKey: "employee-invitation",
  locale: "en" as const,
};

describe("diagnostic intent reconciliation", () => {
  it("keeps undeclared gateway failures ambiguous and requires reconciliation", () => {
    const state = diagnosticFailure(
      new ContractViolation({
        audience: "delegated",
        key: operations.diagnosticSend.key,
        phase: "status",
        status: 502,
      }),
      command,
      0,
    );
    expect(state.phase).toBe("unknown");
    expect(replayAllowed(state, 1000)).toBe(false);
    expect(replayAllowed({ ...state, reconciled: true, sendUnavailable: true }, 1000)).toBe(false);
  });
  it("preserves one command after unknown acceptance and permits replay only after reconciliation", () => {
    const state = diagnosticFailure(new Error("secret-canary"), command, 0);
    expect(state).toEqual({ phase: "unknown", command, message: "unknown" });
    expect(replayAllowed(state, 1000)).toBe(false);
    expect(replayAllowed({ ...state, reconciled: true }, 1000)).toBe(true);
  });
  it("extracts the union-declared limit and holds replay until its deadline", () => {
    const problem = operations.diagnosticSend.parseResponse(
      429,
      problemBody(429, { code: "DIAGNOSTIC_RATE_LIMITED", retryAfterSeconds: 17 }),
    );
    const error = new OperationRefusal(operations.diagnosticSend, 429, problem);
    expect(error.code).toBe("DIAGNOSTIC_RATE_LIMITED");
    expect(error.retryAfterSeconds).toBe(17);
    const state = diagnosticFailure(error, command, 1000);
    expect(state.retryAt).toBe(18000);
    expect(replayAllowed(state, 17999)).toBe(false);
    expect(replayAllowed(state, 18000)).toBe(true);
    expect(JSON.stringify(state)).not.toContain("canary");
  });
  it("holds the conservative limit when the global envelope declares no timing", () => {
    const error = new OperationRefusal(
      operations.diagnosticSend,
      429,
      operations.diagnosticSend.parseResponse(429, problemBody(429)),
    );
    expect(diagnosticFailure(error, command, 0).retryAt).toBe(600000);
  });
  it("never replays a conflict or malformed response", () => {
    const conflict = new OperationRefusal(
      operations.diagnosticSend,
      409,
      problemBody(409, { code: "DIAGNOSTIC_REQUEST_CONFLICT" }),
    );
    expect(replayAllowed(diagnosticFailure(conflict, command, 0), 1000)).toBe(false);
    const malformed = new ContractViolation({
      audience: "delegated",
      key: operations.diagnosticSend.key,
      phase: "response",
    });
    expect(replayAllowed(diagnosticFailure(malformed, command, 0), 1000)).toBe(false);
  });
  it("binds every accepted receipt to the original UUID, sample and language", () => {
    const receipt = operations.diagnosticResult.responses["200"].parse({
      ...command,
      context: "COMPANY",
      isTest: true,
      status: "SENT",
      deliveryPublicId: command.requestId,
    });
    expect(receiptMatches(command, receipt)).toBe(true);
    expect(receiptMatches(command, { ...receipt, locale: "ar" })).toBe(false);
    expect(receiptMatches(command, { ...receipt, emailTypeKey: "company-user-recovery" })).toBe(
      false,
    );
  });
  it("rejects override requests and internal/recipient disclosure in the response", () => {
    expect(() =>
      operations.diagnosticSend.parseRequest({
        params: { sessionPublicId: command.requestId },
        body: { ...command, recipient: "canary@example.test" },
      }),
    ).toThrow(ContractViolation);
    expect(() =>
      operations.diagnosticSend.parseResponse(202, {
        ...command,
        context: "COMPANY",
        isTest: true,
        status: "QUEUED",
        deliveryPublicId: command.requestId,
        providerDetail: "secret",
      }),
    ).toThrow(ContractViolation);
  });
});
