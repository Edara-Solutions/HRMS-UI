import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ContractViolation,
  platformLeadOperations as operations,
  requestPlatformOperation,
} from "@/shared/api";
import { usePlatformSession } from "@/shared/auth";
import { platformSessionFixture } from "../../../../test/audience-fixtures";
import { problemBody } from "../../../../test/operation-fakes";
import { operationNetwork } from "../../../../test/operation-request-mock";
import {
  activityBody,
  contactBody,
  conversionBody,
  domainBody,
  leadBody,
  leadIds,
  leadPermissions,
  pageMeta,
} from "../../../../test/platform-lead-fixtures";
import { crmQueries, runLeadCommand } from "./crm";
import { findPendingRequest } from "./submission";

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
describe("Platform lead contracts", () => {
  it("rejects a foreign contact echo before accepting an update", async () => {
    operationNetwork.current.on(operations.updateContact.key, () => ({
      status: 200,
      body: contactBody({ publicId: leadIds.other }),
    }));
    await expect(
      runLeadCommand(leadIds.lead, {
        kind: "updateContact",
        name: "Owner",
        targetPublicId: leadIds.contact,
        body: { name: "Owner" },
      }),
    ).rejects.toBeInstanceOf(ContractViolation);
  });
  it.each([
    "remove",
    "removeContact",
    "removeActivity",
  ] as const)("%s uses bodyless 204 and route-bound target IDs", async (kind) => {
    const net = operationNetwork.current;
    net.on(operations[kind].key, () => ({ status: 204 }));
    await runLeadCommand(leadIds.lead, { kind, name: "Lead", targetPublicId: leadIds.contact });
    expect(net.calls[0]).toMatchObject({
      audience: "platform",
      input: { params: { publicId: leadIds.lead } },
    });
    expect(net.calls[0].input).not.toHaveProperty("body");
  });
  it.each(["archive", "unarchive"] as const)("%s checks the returned lead scope", async (kind) => {
    operationNetwork.current.on(operations[kind].key, () => ({
      status: 200,
      body: { lead: leadBody({ publicId: leadIds.other }), contacts: [] },
    }));
    await expect(runLeadCommand(leadIds.lead, { kind, name: "Lead" })).rejects.toBeInstanceOf(
      ContractViolation,
    );
  });
  it.each([
    "addContact",
    "updateContact",
    "addActivity",
  ] as const)("%s sends only its exact generated command", async (kind) => {
    const body =
      kind === "addActivity"
        ? { type: "NOTE", note: "Follow up" }
        : { name: "Owner", email: "owner@example.test" };
    operationNetwork.current.on(operations[kind].key, () => ({
      status: kind === "updateContact" ? 200 : 201,
      body: kind === "addActivity" ? activityBody() : contactBody(),
    }));
    await runLeadCommand(leadIds.lead, {
      kind,
      body,
      targetPublicId: leadIds.contact,
      name: "Owner",
    });
    expect(operationNetwork.current.calls[0]).toMatchObject({
      audience: "platform",
      input: { body },
    });
  });
  it.each([
    "provision",
    "verify",
  ] as const)("%s rejects a Company-owned domain and binds the lead route", async (kind) => {
    operationNetwork.current.on(operations[kind].key, () => ({
      status: 200,
      body: domainBody({ owner: "COMPANY" }),
    }));
    await expect(
      runLeadCommand(leadIds.lead, {
        kind,
        name: "Lead",
        ...(kind === "provision" ? { body: { domain: "mail.acme.example" } } : {}),
      }),
    ).rejects.toBeInstanceOf(ContractViolation);
    expect(operationNetwork.current.calls[0]).toMatchObject({
      input: { params: { leadPublicId: leadIds.lead } },
    });
  });
  it("uses identity/resource/page-bound query roots and strips provider failure fields", () => {
    const queries = crmQueries("actor", leadIds.lead, 2);
    expect(queries.activities.queryKey).toEqual([
      "platform",
      "actor",
      operations.activities.key,
      leadIds.lead,
      2,
    ]);
    const safe = queries.domain.select?.(operations.domain.responses[200].parse(domainBody()));
    expect(JSON.stringify(safe)).not.toMatch(/canary/);
    expect(safe?.records[0].value).toBe("verify-acme");
  });
  it("finds an immediate-conversion committed request beyond the first page", async () => {
    operationNetwork.current.on(operations.requests.key, (input) => {
      const query = operations.requests.parseRequest(input).query;
      return {
        status: 200,
        body: {
          items:
            query.page === 2
              ? [conversionBody()]
              : [conversionBody({ lead: leadBody({ publicId: leadIds.other }) })],
          meta: pageMeta(query.page, 2),
        },
      };
    });
    await expect(findPendingRequest(leadIds.lead)).resolves.toEqual({
      publicId: leadIds.request,
      plan: "Growth",
    });
    expect(
      operationNetwork.current.calls.map(
        (call) => operations.requests.parseRequest(call.input).query.page,
      ),
    ).toEqual([1, 2]);
  });
  it.each([
    400, 403, 404, 409, 429, 500,
  ])("keeps %s failures observable with no command retry", async (status) => {
    operationNetwork.current.on(operations.verify.key, () => ({
      status,
      body: problemBody(status),
    }));
    await expect(runLeadCommand(leadIds.lead, { kind: "verify", name: "Lead" })).rejects.toThrow();
    expect(operationNetwork.current.count(operations.verify.key)).toBe(1);
  });
  it("rejects unauthorized extra fields before touching the network", async () => {
    await expect(
      requestPlatformOperation(operations.immediate, {
        body: {
          leadPublicId: leadIds.lead,
          planPublicId: leadIds.plan,
          templateKey: 1,
          ownerPublicId: leadIds.other,
        },
      }),
    ).rejects.toBeInstanceOf(ContractViolation);
    expect(operationNetwork.current.calls).toHaveLength(0);
  });
});
