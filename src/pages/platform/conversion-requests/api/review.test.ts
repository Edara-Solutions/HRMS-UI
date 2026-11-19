import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ContractViolation, platformLeadOperations as operations } from "@/shared/api";
import { usePlatformSession } from "@/shared/auth";
import { platformSessionFixture } from "../../../../test/audience-fixtures";
import { operationNetwork } from "../../../../test/operation-request-mock";
import {
  approvedBody,
  conversionBody,
  deliveryBody,
  leadBody,
  leadIds,
  leadPermissions,
  planBody,
} from "../../../../test/platform-lead-fixtures";
import { canApprove, canRetry, runReviewCommand } from "./review";

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
beforeEach(() => {
  operationNetwork.install();
  usePlatformSession
    .getState()
    .setSession(platformSessionFixture({ permissions: leadPermissions }));
});
afterEach(() => usePlatformSession.getState().clearSession());
describe("Conversion transitions and original delivery", () => {
  it.each([
    { status: "APPROVED" },
    { status: "REJECTED" },
    { plan: planBody({ isActive: false }) },
    { primaryContact: null },
    { lead: leadBody({ isArchived: true }) },
    { lead: leadBody({ isConverted: true }) },
    { lead: leadBody({ status: "NEW" }) },
  ])("does not approve when a prerequisite changed: %j", async (override) => {
    operationNetwork.current.on(operations.request.key, () => ({
      status: 200,
      body: conversionBody(override),
    }));
    await expect(
      runReviewCommand(leadIds.request, { kind: "approve", body: { templateKey: 1 } }),
    ).rejects.toThrow("changed");
    expect(operationNetwork.current.count(operations.approve.key)).toBe(0);
  });
  it.each([
    "approve",
    "reject",
    "changePlan",
  ] as const)("%s rechecks the request and sends its exact body once", async (kind) => {
    const body =
      kind === "approve"
        ? { templateKey: 1 }
        : kind === "reject"
          ? { reason: "Not suitable" }
          : { planPublicId: leadIds.plan };
    operationNetwork.current.on(operations.request.key, () => ({
      status: 200,
      body: conversionBody(),
    }));
    operationNetwork.current.on(operations[kind].key, () => ({
      status: 200,
      body: conversionBody(),
    }));
    await runReviewCommand(leadIds.request, { kind, body });
    expect(operationNetwork.current.calls.map((call) => call.key)).toEqual([
      operations.request.key,
      operations[kind].key,
    ]);
    expect(operationNetwork.current.calls[1]).toMatchObject({
      audience: "platform",
      input: { params: { publicId: leadIds.request }, body },
    });
  });
  it.each([
    "PENDING",
    "SUCCEEDED",
    "EXHAUSTED",
  ])("%s delivery cannot be retried", async (status) => {
    const delivery = deliveryBody({ status });
    const request = approvedBody({ ownerOnboardingDelivery: delivery });
    expect(
      canRetry(
        operations.request.responses[200].parse(request),
        operations.delivery.responses[200].parse(delivery),
      ),
    ).toBe(false);
  });
  it("retries the original failed delivery without a body, owner or recipient", async () => {
    const net = operationNetwork.current;
    net.on(operations.request.key, () => ({ status: 200, body: approvedBody() }));
    net.on(operations.delivery.key, () => ({ status: 200, body: deliveryBody() }));
    net.on(operations.retryDelivery.key, () => ({
      status: 200,
      body: deliveryBody({ status: "PENDING" }),
    }));
    await runReviewCommand(leadIds.request, {
      kind: "retryDelivery",
      deliveryPublicId: leadIds.delivery,
    });
    expect(net.calls[2].input).toEqual({ params: { publicId: leadIds.request } });
  });
  it("blocks retries when the delivery was replaced while confirmation was open", async () => {
    const net = operationNetwork.current;
    net.on(operations.request.key, () => ({ status: 200, body: approvedBody() }));
    net.on(operations.delivery.key, () => ({
      status: 200,
      body: deliveryBody({ publicId: leadIds.other }),
    }));
    await expect(
      runReviewCommand(leadIds.request, {
        kind: "retryDelivery",
        deliveryPublicId: leadIds.delivery,
      }),
    ).rejects.toThrow("changed");
    expect(net.count(operations.retryDelivery.key)).toBe(0);
  });
  it("rejects a foreign request response before issuing any command", async () => {
    operationNetwork.current.on(operations.request.key, () => ({
      status: 200,
      body: conversionBody({ publicId: leadIds.other }),
    }));
    await expect(
      runReviewCommand(leadIds.request, { kind: "reject", body: { reason: "No" } }),
    ).rejects.toBeInstanceOf(ContractViolation);
    expect(operationNetwork.current.count(operations.reject.key)).toBe(0);
  });
  it("allows a nullable requester without inventing authority and checks eligible contact fields", () => {
    expect(canApprove(operations.request.responses[200].parse(conversionBody()))).toBe(true);
    expect(operations.request.responses[200].parse(conversionBody()).requester).toBeNull();
  });
});
