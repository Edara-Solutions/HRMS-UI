import { queryOptions } from "@tanstack/react-query";
import {
  platformPeopleOperations as operations,
  platformQueryKey,
  platformReadQuery,
  requestPlatformOperation,
  sendPlatformCommand,
} from "@/shared/api";
import type { PersonUpdate } from "../model/person";

export const sessionsPageSize = 10;

/** Every read the person workspace makes, under the live identity's cache root. */
export function personQueries(userPublicId: string, publicId: string) {
  return {
    person: queryOptions({
      queryKey: platformQueryKey(userPublicId, operations.user, publicId),
      queryFn: ({ signal }) =>
        requestPlatformOperation(operations.user, { params: { publicId } }, signal),
    }),
    assignments: queryOptions({
      queryKey: platformQueryKey(userPublicId, operations.assignments, publicId),
      queryFn: ({ signal }) =>
        requestPlatformOperation(
          operations.assignments,
          { query: { platformUserPublicId: publicId } },
          signal,
        ),
    }),
    /** Role names and root detection both come from the Platform role catalogue. */
    roles: platformReadQuery(userPublicId, operations.roles),
    sessions: (page: number) =>
      queryOptions({
        queryKey: platformQueryKey(userPublicId, operations.userSessions, publicId, page),
        queryFn: ({ signal }) =>
          requestPlatformOperation(
            operations.userSessions,
            { params: { publicId }, query: { page, pageSize: sessionsPageSize } },
            signal,
          ),
      }),
  };
}

/** Everything a person-level change can make stale for this identity. */
export function personRoots(userPublicId: string) {
  return [
    platformQueryKey(userPublicId, operations.user),
    platformQueryKey(userPublicId, operations.users),
    platformQueryKey(userPublicId, operations.assignments),
    platformQueryKey(userPublicId, operations.userSessions),
    platformQueryKey(userPublicId, operations.roles),
  ];
}

export function updatePerson(publicId: string, body: PersonUpdate) {
  return requestPlatformOperation(operations.updateUser, { params: { publicId }, body });
}

export function reissueInvitation(publicId: string) {
  return sendPlatformCommand(operations.reissueInvitation, { params: { publicId }, body: {} });
}

export function forceRecovery(publicId: string) {
  return sendPlatformCommand(operations.forceRecovery, { params: { publicId }, body: {} });
}

export function suspendPerson(publicId: string) {
  return sendPlatformCommand(operations.suspendUser, { params: { publicId }, body: {} });
}

export function unsuspendPerson(publicId: string) {
  return sendPlatformCommand(operations.unsuspendUser, { params: { publicId }, body: {} });
}

export function deletePerson(publicId: string) {
  return sendPlatformCommand(operations.deleteUser, { params: { publicId } });
}

export function revokePersonSession(publicId: string, sessionPublicId: string) {
  return sendPlatformCommand(operations.revokeUserSession, {
    params: { publicId, sessionPublicId },
  });
}

export function revokePersonSessions(publicId: string) {
  return sendPlatformCommand(operations.revokeUserSessions, { params: { publicId } });
}

export function assignRole(
  platformUserPublicId: string,
  rolePublicId: string,
  expiresAt: string | null,
) {
  return requestPlatformOperation(operations.assignRole, {
    body: { platformUserPublicId, rolePublicId, expiresAt },
  });
}

export function revokeAssignment(assignmentPublicId: string) {
  return sendPlatformCommand(operations.revokeAssignment, { params: { assignmentPublicId } });
}
