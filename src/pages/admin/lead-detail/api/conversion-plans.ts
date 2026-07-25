import { useQuery } from "@tanstack/react-query";
import { apiClient, parsePlanListResponse } from "@/shared/api";

const conversionPlansKey = ["plans", "public", { isActive: true }] as const;

export function useConversionPlans() {
  return useQuery({
    queryKey: conversionPlansKey,
    queryFn: async () => {
      const response: unknown = await apiClient
        .get("plans/public", { searchParams: new URLSearchParams({ isActive: "true" }) })
        .json();
      return parsePlanListResponse(response);
    },
  });
}
