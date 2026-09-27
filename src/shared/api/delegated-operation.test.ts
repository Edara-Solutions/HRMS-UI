// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  const storage = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  });
});

import { usePlatformSession } from "@/shared/auth";
import { platformSessionFixture } from "../../test/audience-fixtures";
import { json, problem, stubNetwork } from "../../test/network-fixtures";
import {
  accessSessionOperations,
  delegatedCompanyOperations as operations,
} from "./access-session-operations";
import { AudienceSessionChanged } from "./audience-operation";
import { delegatedQueryKey, requestDelegatedOperation } from "./delegated-operation";
import { ContractViolation } from "./generated/runtime";
import { executeOperationRequest, OperationRefusal } from "./operation-request";
import { delegatedApiClient, platformApiClient } from "./platform-client";

const sessionPublicId = "3f0f7a52-5d5b-4b8e-9d7e-7c3e8b1f2a10";
const readiness = { ready: true };

beforeEach(() => usePlatformSession.getState().setSession(platformSessionFixture()));
afterEach(() => {
  usePlatformSession.getState().clearSession();
});

describe("delegated Company operations", () => {
  it("sends through the delegated client with the Platform sign-in token", async () => {
    const requests = stubNetwork({
      [`GET /api/v1/platform/access-sessions/${sessionPublicId}/email-readiness`]: () =>
        json(readiness),
    });
    await expect(
      requestDelegatedOperation(operations.emailReadiness, { params: { sessionPublicId } }),
    ).resolves.toEqual(readiness);
    expect(requests).toEqual([
      {
        key: `GET /api/v1/platform/access-sessions/${sessionPublicId}/email-readiness`,
        authorization: "Bearer access-canary",
        body: undefined,
      },
    ]);
  });

  it("keeps the delegated and direct Platform clients from crossing audiences", async () => {
    const requests = stubNetwork({});
    const input = { params: { sessionPublicId } };
    await expect(
      executeOperationRequest(platformApiClient, operations.emailReadiness, input),
    ).rejects.toBeInstanceOf(ContractViolation);
    await expect(
      executeOperationRequest(delegatedApiClient, accessSessionOperations.session, input),
    ).rejects.toBeInstanceOf(ContractViolation);
    expect(requests).toEqual([]);
  });

  it("refuses a malformed session identifier before any request", async () => {
    const requests = stubNetwork({});
    await expect(
      requestDelegatedOperation(operations.emailReadiness, {
        params: { sessionPublicId: "../users" },
      }),
    ).rejects.toBeInstanceOf(ContractViolation);
    expect(requests).toEqual([]);
  });

  it("keeps an inactive session refusal distinct and free of backend text", async () => {
    stubNetwork({
      [`GET /api/v1/platform/access-sessions/${sessionPublicId}/email-readiness`]: () =>
        problem(403),
    });
    const refusal = await requestDelegatedOperation(operations.emailReadiness, {
      params: { sessionPublicId },
    }).catch((error: unknown) => error);
    expect(refusal).toBeInstanceOf(OperationRefusal);
    expect(refusal).toMatchObject({ status: 403, audience: "delegated" });
    expect(JSON.stringify(refusal)).not.toContain("canary");
  });

  it("drops a response that settles after the Platform identity was replaced", async () => {
    stubNetwork({
      [`GET /api/v1/platform/access-sessions/${sessionPublicId}/email-readiness`]: () => {
        usePlatformSession
          .getState()
          .setSession(platformSessionFixture({ publicId: "5c7f0f4e-2b5d-4d51-9a55-0d3b1f6a7c21" }));
        return json(readiness);
      },
    });
    await expect(
      requestDelegatedOperation(operations.emailReadiness, { params: { sessionPublicId } }),
    ).rejects.toBeInstanceOf(AudienceSessionChanged);
  });

  it("roots cache keys at the delegated audience, operator and Access Session", () => {
    const key = delegatedQueryKey("operator", sessionPublicId, operations.users, "1");
    expect(key).toEqual([
      "platform-delegated",
      "operator",
      sessionPublicId,
      operations.users.key,
      "1",
    ]);
    expect(delegatedQueryKey("operator", sessionPublicId)).toEqual(key.slice(0, 3));
    expect(JSON.stringify(key)).not.toMatch(/access-canary|refresh-canary/);
  });
});
