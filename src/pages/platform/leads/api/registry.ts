import { queryOptions } from "@tanstack/react-query";
import {
  platformLeadOperations as operations,
  platformQueryKey,
  requestPlatformOperation,
} from "@/shared/api";
import { serializeDateEdgeValue } from "@/shared/lib/date-edge";
import type { LeadsSearch } from "../model/page-search";
export function leadRegistryQuery(userPublicId: string, search: LeadsSearch) {
  const { q, createdFrom, createdTo, ...rest } = search;
  const query = {
    ...rest,
    ...(q ? { search: q } : {}),
    ...(createdFrom ? { createdFrom: serializeDateEdgeValue(createdFrom) } : {}),
    ...(createdTo ? { createdTo: serializeDateEdgeValue(createdTo) } : {}),
  };
  return queryOptions({
    queryKey: platformQueryKey(userPublicId, operations.leads, JSON.stringify(query)),
    queryFn: ({ signal }) => requestPlatformOperation(operations.leads, { query }, signal),
    select: (value) => ({
      meta: value.meta,
      leads: value.items.map(({ lead, contacts }) => ({
        publicId: lead.publicId,
        companyName: lead.companyName,
        country: lead.country,
        status: lead.status,
        source: lead.source,
        isArchived: lead.isArchived,
        isConverted: lead.isConverted,
        numberOfAttempts: lead.numberOfAttempts,
        lastAttemptAt: lead.lastAttemptAt,
        contacts: contacts.map(({ publicId, name, email, isPrimary }) => ({
          publicId,
          name,
          email,
          isPrimary,
        })),
      })),
    }),
  });
}
