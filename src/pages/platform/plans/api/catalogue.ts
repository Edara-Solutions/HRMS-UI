import { queryOptions } from "@tanstack/react-query";
import type { z } from "zod";
import {
  ContractViolation,
  platformPlanOperations as operations,
  platformQueryKey,
  requestPlatformOperation,
} from "@/shared/api";

export type Plan = z.output<(typeof operations.plan.responses)["200"]>;
export type Price = z.output<(typeof operations.price.responses)["200"]>;
export type Market = z.input<typeof operations.effective.requestSchema>["query"];
export type CatalogueFilters = z.input<typeof operations.plans.requestSchema>["query"];

export function plansQuery(identity: string, query: CatalogueFilters) {
  return queryOptions({
    queryKey: platformQueryKey(identity, operations.plans, JSON.stringify(query)),
    queryFn: ({ signal }) => requestPlatformOperation(operations.plans, { query }, signal),
  });
}
export function planQuery(identity: string, publicId: string) {
  return queryOptions({
    queryKey: platformQueryKey(identity, operations.plan, publicId),
    queryFn: async ({ signal }) => {
      const result = await requestPlatformOperation(
        operations.plan,
        { params: { publicId }, query: {} },
        signal,
      );
      verifyTarget(result.publicId, publicId, operations.plan);
      return result;
    },
  });
}
export function pricesQuery(identity: string, publicId: string) {
  return queryOptions({
    queryKey: platformQueryKey(identity, operations.prices, publicId),
    queryFn: ({ signal }) =>
      requestPlatformOperation(operations.prices, { params: { publicId }, query: {} }, signal),
  });
}
export function effectiveQuery(identity: string, publicId: string, query: Market) {
  return queryOptions({
    queryKey: platformQueryKey(identity, operations.effective, publicId, JSON.stringify(query)),
    queryFn: async ({ signal }) => {
      const result = await requestPlatformOperation(
        operations.effective,
        { params: { publicId }, query },
        signal,
      );
      verifyTarget(result.planPublicId, publicId, operations.effective);
      if (
        result.money.currencyCode !== query.currencyCode ||
        result.billingInterval !== query.billingInterval ||
        result.intervalCount !== (query.intervalCount ?? 1)
      )
        throw new ContractViolation({
          audience: "platform",
          key: operations.effective.key,
          status: 200,
          phase: "response",
        });
      return result;
    },
  });
}
export function verifyTarget(actual: string, expected: string, operation: { key: string }) {
  if (actual !== expected)
    throw new ContractViolation({
      audience: "platform",
      key: operation.key,
      status: 200,
      phase: "response",
    });
}

export class StaleCatalogue extends Error {
  constructor() {
    super("Catalogue changed; reconcile before another command.");
  }
}

/** Price DTOs omit the plan owner; membership must come from the scoped price list. */
export async function recheckPrice(planPublicId: string, price: Price, check: () => void) {
  const listed = await requestPlatformOperation(operations.prices, {
    params: { publicId: planPublicId },
    query: {},
  });
  if (!listed.data.some((candidate) => candidate.publicId === price.publicId))
    throw new StaleCatalogue();
  check();
  const fresh = await requestPlatformOperation(operations.price, {
    params: { publicId: price.publicId },
  });
  verifyTarget(fresh.publicId, price.publicId, operations.price);
  if (fresh.updatedAt !== price.updatedAt) throw new StaleCatalogue();
  check();
}
