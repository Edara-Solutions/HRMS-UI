import { queryOptions } from "@tanstack/react-query";
import {
  platformCompanyOperations as operations,
  platformQueryKey,
  requestPlatformOperation,
} from "@/shared/api";
/** Cursor pages support the global console without inventing a subscription-list endpoint. */
export function registryCursorQuery(userPublicId: string, cursor?: string) {
  return queryOptions({
    queryKey: platformQueryKey(userPublicId, operations.cursor, cursor ?? "", 20),
    queryFn: ({ signal }) =>
      requestPlatformOperation(
        operations.cursor,
        { query: { limit: 20, ...(cursor ? { cursor } : {}) } },
        signal,
      ),
    select: (value) => ({
      meta: value.meta,
      companies: value.data.map(({ publicId, name }) => ({ publicId, name })),
    }),
  });
}
