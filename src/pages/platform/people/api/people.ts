import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import {
  platformPeopleOperations as operations,
  platformQueryKey,
  platformReadQuery,
  requestPlatformOperation,
} from "@/shared/api";
import { type Invitation, rosterPageSize } from "../model/roster";

/** One roster page, kept visible while the next page of the same identity loads. */
export function rosterQuery(userPublicId: string, page: number) {
  const query = { page, pageSize: rosterPageSize };
  return queryOptions({
    queryKey: platformQueryKey(userPublicId, operations.users, page),
    queryFn: ({ signal }) => requestPlatformOperation(operations.users, { query }, signal),
    // Only the same identity's previous page may stay visible while the next one loads.
    placeholderData: keepPreviousData,
  });
}

/** Every roster page for this identity, for invalidation after a roster change. */
export function rosterRoot(userPublicId: string) {
  return platformQueryKey(userPublicId, operations.users);
}

/** Roles offered for initial assignment; read only for an actor who may assign them. */
export function rolesQuery(userPublicId: string) {
  return platformReadQuery(userPublicId, operations.roles);
}

/** Invites a pending Platform User; roles are included only when the actor may assign them. */
export function invitePerson(body: Invitation) {
  return requestPlatformOperation(operations.inviteUser, { body });
}
