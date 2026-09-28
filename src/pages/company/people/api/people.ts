import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import {
  companyQueryKey,
  companyPeopleOperations as operations,
  requestCompanyOperation,
} from "@/shared/api";
import {
  type NewPerson,
  type PersonStatus,
  type RosterSearch,
  rosterPageSize,
} from "../model/roster";

export function rosterQuery(userPublicId: string, search: RosterSearch) {
  const query = {
    search: search.q || undefined,
    status: search.status,
    page: search.page ?? 1,
    pageSize: rosterPageSize,
    sort: "nameAsc" as const,
  };
  return queryOptions({
    queryKey: companyQueryKey(userPublicId, operations.users, JSON.stringify(query)),
    queryFn: ({ signal }) => requestCompanyOperation(operations.users, { query }, signal),
    // Only the same identity's previous page may stay visible while the next one loads.
    placeholderData: keepPreviousData,
  });
}

/** Every roster page for this identity, for invalidation after a roster change. */
export function rosterRoot(userPublicId: string) {
  return companyQueryKey(userPublicId, operations.users);
}

/** A fresh preview each time the create form opens; the server may still assign another code. */
export function employeeCodePreviewQuery(userPublicId: string) {
  return queryOptions({
    queryKey: companyQueryKey(userPublicId, operations.employeeCode),
    queryFn: ({ signal }) => requestCompanyOperation(operations.employeeCode, {}, signal),
    staleTime: 0,
    gcTime: 0,
  });
}

export function createPerson(body: NewPerson) {
  return requestCompanyOperation(operations.createUser, { body });
}

export function createPeople(body: NewPerson[]) {
  return requestCompanyOperation(operations.createUsers, { body });
}

export function changePeopleStatus(publicIds: readonly string[], status: PersonStatus) {
  return requestCompanyOperation(operations.updateUsers, {
    body: publicIds.map((publicId) => ({ publicId, status })),
  });
}

export function deletePeople(publicIds: readonly string[]) {
  return requestCompanyOperation(operations.deleteUsers, { body: { publicIds: [...publicIds] } });
}
