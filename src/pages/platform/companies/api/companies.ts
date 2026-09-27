import { queryOptions } from "@tanstack/react-query";
import {
  platformCompanyOperations as operations,
  platformQueryKey,
  requestPlatformOperation,
} from "@/shared/api";
export function companiesQuery(userPublicId: string, page: number) {
  return queryOptions({
    queryKey: platformQueryKey(userPublicId, operations.companies, page, 20),
    queryFn: ({ signal }) =>
      requestPlatformOperation(operations.companies, { query: { page, limit: 20 } }, signal),
    select: (data) => ({
      ...data,
      data: data.data.map(
        ({ publicId, name, companyCode, country, lifecycleStatus, isActive }) => ({
          publicId,
          name,
          companyCode,
          country,
          lifecycleStatus,
          isActive,
        }),
      ),
    }),
  });
}
