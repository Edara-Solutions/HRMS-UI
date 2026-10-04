import { queryOptions } from "@tanstack/react-query";
import {
  ContractViolation,
  executePublicRequest,
  loadPublicPlansContract,
  type PublicPlansRequest,
} from "@/shared/public-api";

export interface PublicPlanSearch {
  billingInterval?: PublicPlansRequest["query"]["billingInterval"];
  countryCode?: string;
  currencyCode?: string;
  intervalCount?: number;
  name?: string;
  regionCode?: string;
}

export const publicPlanKeys = {
  all: ["public", "plans"] as const,
  list: (search: PublicPlanSearch) => [...publicPlanKeys.all, search] as const,
};

export async function fetchPublicPlans(search: PublicPlanSearch) {
  const { operation, requestSchema, responseSchemas } = await loadPublicPlansContract();
  const request = requestSchema.parse({ query: search });
  return executePublicRequest({
    operation,
    request,
    responseSchema: responseSchemas["200"],
  });
}

export type PublicPlansResponse = Awaited<ReturnType<typeof fetchPublicPlans>>;

export function publicPlansQuery(search: PublicPlanSearch) {
  return queryOptions({
    queryKey: publicPlanKeys.list(search),
    queryFn: () => fetchPublicPlans(search),
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => !(error instanceof ContractViolation) && failureCount < 2,
  });
}
