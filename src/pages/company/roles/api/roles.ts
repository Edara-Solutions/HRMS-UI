import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import {
  companyQueryKey,
  companyPeopleOperations as operations,
  requestCompanyOperation,
} from "@/shared/api";

export const rolesPageSize = 20;

export function rolesQuery(userPublicId: string, page: number, search: string) {
  const query = { page, pageSize: rolesPageSize, search: search || undefined };
  return queryOptions({
    queryKey: companyQueryKey(userPublicId, operations.roles, JSON.stringify(query)),
    queryFn: ({ signal }) => requestCompanyOperation(operations.roles, { query }, signal),
    placeholderData: keepPreviousData,
  });
}

export function rolesRoot(userPublicId: string) {
  return companyQueryKey(userPublicId, operations.roles);
}

export function createRole(body: { name: string; description?: string }) {
  return requestCompanyOperation(operations.createRole, { body });
}
