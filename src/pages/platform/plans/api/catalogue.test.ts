import { QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ContractViolation, platformPlanOperations as operations } from "@/shared/api";
import { usePlatformSession } from "@/shared/auth";
import { platformSessionFixture } from "../../../../test/audience-fixtures";
import { problemBody } from "../../../../test/operation-fakes";
import { operationNetwork } from "../../../../test/operation-request-mock";
import {
  effectiveBody,
  planBody,
  planDetailBody,
  planId,
  planPermissions,
  priceBody,
  priceId,
} from "../../../../test/platform-plan-fixtures";
import { planFormSchema } from "../model/catalogue-form";
import { effectiveQuery, planQuery, plansQuery, pricesQuery } from "./catalogue";

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
describe("catalogue contract ownership", () => {
  const cases = [
    [operations.plans, 200, { query: {} }, { data: [planDetailBody()] }],
    [operations.plan, 200, { params: { publicId: planId }, query: {} }, planDetailBody()],
    [operations.create, 201, { body: { name: "Growth", duration: 30, features: [] } }, planBody()],
    [
      operations.update,
      200,
      { params: { publicId: planId }, body: { description: null } },
      planBody(),
    ],
    [
      operations.remove,
      200,
      { params: { publicId: planId } },
      { message: "server-message-canary" },
    ],
    [operations.prices, 200, { params: { publicId: planId }, query: {} }, { data: [priceBody()] }],
    [operations.price, 200, { params: { publicId: priceId } }, priceBody()],
    [
      operations.createPrice,
      201,
      {
        params: { publicId: planId },
        body: { currencyCode: "USD", amountMinor: 7500, billingInterval: "monthly" },
      },
      priceBody(),
    ],
    [
      operations.updatePrice,
      200,
      { params: { publicId: priceId }, body: { countryCode: null } },
      priceBody(),
    ],
    [
      operations.removePrice,
      200,
      { params: { publicId: priceId } },
      { message: "server-message-canary" },
    ],
    [
      operations.effective,
      200,
      { params: { publicId: planId }, query: { currencyCode: "USD", billingInterval: "monthly" } },
      effectiveBody(),
    ],
  ] as const;
  for (const [operation, status, input, body] of cases)
    it(`pins ${operation.key} to its declared contracts`, () => {
      expect(operation.audience).toBe("platform");
      expect(operation.parseRequest(input)).toEqual(input);
      expect(operation.parseResponse(status, body)).toEqual(body);
      for (const failure of [400, 401, 403, 404])
        expect(operation.parseResponse(failure, problemBody(failure))).toMatchObject({
          status: failure,
        });
      expect(() => operation.parseResponse(status, { secret: "response-canary" })).toThrow(
        ContractViolation,
      );
      expect(() => operation.parseResponse(429, problemBody(429))).toThrow(ContractViolation);
    });
  it("keys identity, resource and explicit market without credentials", () => {
    const query = { currencyCode: "USD", billingInterval: "monthly" as const };
    const first = effectiveQuery("operator-a", planId, query).queryKey;
    expect(first).toEqual([
      "platform",
      "operator-a",
      operations.effective.key,
      planId,
      JSON.stringify(query),
    ]);
    expect(first).not.toEqual(effectiveQuery("operator-b", planId, query).queryKey);
    expect(first).not.toEqual(effectiveQuery("operator-a", priceId, query).queryKey);
    expect(first).not.toEqual(
      effectiveQuery("operator-a", planId, { ...query, currencyCode: "JPY" }).queryKey,
    );
    expect(planQuery("operator-a", planId).queryKey).not.toEqual(
      pricesQuery("operator-a", planId).queryKey,
    );
    expect(plansQuery("operator-a", {}).queryKey).not.toEqual(
      plansQuery("operator-a", { isActive: false }).queryKey,
    );
  });
  it("rejects an effective price for a different target or market", async () => {
    const net = operationNetwork.install();
    usePlatformSession
      .getState()
      .setSession(platformSessionFixture({ permissions: planPermissions }));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    for (const body of [
      effectiveBody({ planPublicId: priceId }),
      effectiveBody({ billingInterval: "annually" }),
      effectiveBody({ money: { ...priceBody().money, currencyCode: "JPY" } }),
    ]) {
      net.on(operations.effective.key, () => ({ status: 200, body }));
      await expect(
        client.fetchQuery(
          effectiveQuery("operator", planId, { currencyCode: "USD", billingInterval: "monthly" }),
        ),
      ).rejects.toBeInstanceOf(ContractViolation);
    }
  });
  it("preserves unchanged limits and supports explicit removal", () => {
    const plan = operations.plan.responses["200"].parse(planDetailBody());
    expect(planFormSchema(plan).parse({ limits: { MAX_USERS: 50 } })).toEqual({
      limits: { MAX_USERS: 50, MAX_DEPARTMENTS: 20 },
    });
    expect(planFormSchema(plan).parse({ limits: { MAX_USERS: "" } })).toEqual({
      limits: { MAX_DEPARTMENTS: 20 },
    });
    expect(planFormSchema(plan).parse({ features: "" })).toEqual({ features: [] });
    expect(planFormSchema(plan).parse({ description: null })).toEqual({ description: null });
    expect(planFormSchema(plan).safeParse({ features: "UNKNOWN_CANARY" }).success).toBe(false);
  });
});
