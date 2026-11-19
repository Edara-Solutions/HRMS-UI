import { queryOptions } from "@tanstack/react-query";
import {
  platformCommunicationsOperations,
  platformCompanyOperations,
  platformQueryKey,
  requestPlatformOperation,
} from "@/shared/api";
export interface DeliveryFilterOption {
  value: string;
  code: string;
  label: string;
  searchText: string;
}

export function companyFilterOptionsQuery(identity: string) {
  const operation = platformCompanyOperations.companies;
  return queryOptions({
    queryKey: platformQueryKey(identity, operation, "delivery-filter", 1, 100),
    queryFn: ({ signal }) =>
      requestPlatformOperation(operation, { query: { page: 1, limit: 100 } }, signal),
    select: (result): DeliveryFilterOption[] =>
      result.data.map(({ publicId, companyCode, name }) => ({
        value: publicId,
        code: companyCode,
        label: name,
        searchText: `${companyCode} ${name}`,
      })),
  });
}

export function emailTypeFilterOptionsQuery(identity: string) {
  const operation = platformCommunicationsOperations.emailTypes;
  return queryOptions({
    queryKey: platformQueryKey(identity, operation, "delivery-filter"),
    queryFn: ({ signal }) => requestPlatformOperation(operation, {}, signal),
    select: (result): DeliveryFilterOption[] =>
      result.items.map(({ key, description, context }) => ({
        value: key,
        code: key,
        label: description,
        searchText: `${key} ${description} ${context}`,
      })),
  });
}
