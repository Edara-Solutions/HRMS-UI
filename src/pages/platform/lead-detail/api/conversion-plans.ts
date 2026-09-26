import { useQuery } from "@tanstack/react-query";
import { apiClient, parsePlanListResponse } from "@/shared/api";

const conversionPlansKey = ["plans", "conversion", { isActive: true }] as const;

export function useConversionPlans() {
  return useQuery({
    queryKey: conversionPlansKey,
    queryFn: async () => {
      const response: unknown = await apiClient
        .get("plans", { searchParams: new URLSearchParams({ isActive: "true" }) })
        .json();
      return parsePlanListResponse(response);
    },
  });
}
