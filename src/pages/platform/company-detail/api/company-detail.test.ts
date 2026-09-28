import { QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ContractViolation } from "@/shared/api";
import { usePlatformSession } from "@/shared/auth";
import { platformSessionFixture } from "../../../../test/audience-fixtures";
import { operationNetwork } from "../../../../test/operation-request-mock";
import {
  companyActivationBody,
  companyBody,
  companyCommercialBody,
  companyIds,
  companyPolicyBody,
  companySubscriptionBody,
} from "../../../../test/platform-company-fixtures";
import { companyQueries } from "./company-detail";

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
describe("Platform Company read boundaries", () => {
  it.each([
    ["company", { ...companyBody(), publicId: companyIds.other }],
    ["activation", { ...companyActivationBody(), companyPublicId: companyIds.other }],
    [
      "policy",
      {
        ...companyPolicyBody(),
        policy: { ...companyPolicyBody().policy, companyPublicId: companyIds.other },
      },
    ],
    ["commercial", { ...companyCommercialBody(), companyPublicId: companyIds.other }],
    [
      "subscription",
      {
        ...companySubscriptionBody(),
        subscription: {
          ...companySubscriptionBody().subscription,
          companyPublicId: companyIds.other,
        },
      },
    ],
  ] as const)("rejects a foreign Company echo from %s before projection", async (name, body) => {
    const net = operationNetwork.install();
    const session = platformSessionFixture();
    usePlatformSession.getState().setSession(session);
    const queries = companyQueries(session.user.publicId, companyIds.company);
    const query = queries[name];
    net.on(String(query.queryKey[2]), () => ({ status: 200, body }));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    // All reads return different declared shapes; execute each through its concrete query option.
    switch (name) {
      case "company":
        await expect(client.fetchQuery(queries.company)).rejects.toBeInstanceOf(ContractViolation);
        break;
      case "activation":
        await expect(client.fetchQuery(queries.activation)).rejects.toBeInstanceOf(
          ContractViolation,
        );
        break;
      case "policy":
        await expect(client.fetchQuery(queries.policy)).rejects.toBeInstanceOf(ContractViolation);
        break;
      case "commercial":
        await expect(client.fetchQuery(queries.commercial)).rejects.toBeInstanceOf(
          ContractViolation,
        );
        break;
      case "subscription":
        await expect(client.fetchQuery(queries.subscription)).rejects.toBeInstanceOf(
          ContractViolation,
        );
        break;
    }
  });
  it("rejects late Company content after Platform identity replacement", async () => {
    const net = operationNetwork.install();
    const session = platformSessionFixture();
    usePlatformSession.getState().setSession(session);
    let finish: (body: unknown) => void = () => {};
    net.on(
      "GET /api/v1/platform/companies/{publicId}",
      () =>
        new Promise((resolve) => {
          finish = (body) => resolve({ status: 200, body });
        }),
    );
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const pending = client.fetchQuery(
      companyQueries(session.user.publicId, companyIds.company).company,
    );
    usePlatformSession
      .getState()
      .setSession(platformSessionFixture({ publicId: companyIds.other }));
    finish(companyBody());
    await expect(pending).rejects.toThrow("session changed");
    expect(client.getQueryData(["platform", companyIds.other])).toBeUndefined();
  });
});
