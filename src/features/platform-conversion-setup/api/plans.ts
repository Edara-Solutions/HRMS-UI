import { useQuery } from "@tanstack/react-query";
import {
  platformLeadOperations as operations,
  platformQueryKey,
  requestPlatformOperation,
  usePlatformAccess,
} from "@/shared/api";
export function useConversionPlans(enabled = true) {
  const access = usePlatformAccess();
  const allowed = access.availability(operations.plans.key).state === "enabled";
  const { data, error, isPending, refetch } = useQuery({
    queryKey: platformQueryKey(access.user?.publicId ?? "", operations.plans, "active"),
    queryFn: ({ signal }) =>
      requestPlatformOperation(operations.plans, { query: { isActive: true } }, signal),
    enabled: enabled && allowed,
    select: (value) =>
      value.data.filter((plan) => plan.isActive).map(({ publicId, name }) => ({ publicId, name })),
  });
  return { data, error, isPending: isPending && allowed, refetch };
}
