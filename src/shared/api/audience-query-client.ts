import { QueryClient } from "@tanstack/react-query";
import { ContractViolation } from "./generated/runtime";

export function createAudienceQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => !(error instanceof ContractViolation) && failureCount < 1,
      },
      mutations: { retry: false },
    },
  });
}
