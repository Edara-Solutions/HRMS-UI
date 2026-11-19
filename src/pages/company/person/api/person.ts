import { queryOptions } from "@tanstack/react-query";
import {
  companyQueryKey,
  OperationRefusal,
  companyPeopleOperations as operations,
  requestCompanyOperation,
  sendCompanyCommand,
} from "@/shared/api";
import type { PersonUpdate } from "../model/person";

export const sessionsPageSize = 10;

export function personQueries(userPublicId: string, publicId: string) {
  return {
    person: queryOptions({
      queryKey: companyQueryKey(userPublicId, operations.user, publicId),
      queryFn: ({ signal }) =>
        requestCompanyOperation(operations.user, { params: { publicId } }, signal),
    }),
    role: queryOptions({
      queryKey: companyQueryKey(userPublicId, operations.userRole, publicId),
      // A person with no active assignment is a declared 404 on this read, not a concealed target.
      queryFn: async ({ signal }) => {
        try {
          return await requestCompanyOperation(
            operations.userRole,
            { params: { publicId } },
            signal,
          );
        } catch (error) {
          if (error instanceof OperationRefusal && error.status === 404 && !error.code) return null;
          throw error;
        }
      },
    }),
    sessions: (page: number) =>
      queryOptions({
        queryKey: companyQueryKey(userPublicId, operations.userSessions, publicId, page),
        queryFn: ({ signal }) =>
          requestCompanyOperation(
            operations.userSessions,
            { params: { publicId }, query: { page, pageSize: sessionsPageSize } },
            signal,
          ),
      }),
    /** Assignable roles and Owner detection both come from the Company role catalogue. */
    roles: queryOptions({
      queryKey: companyQueryKey(userPublicId, operations.roles, "assignable"),
      queryFn: ({ signal }) =>
        requestCompanyOperation(operations.roles, { query: { page: 1, pageSize: 100 } }, signal),
    }),
  };
}

/** Everything a person-level change can make stale for this identity. */
export function personRoots(userPublicId: string) {
  return [
    companyQueryKey(userPublicId, operations.user),
    companyQueryKey(userPublicId, operations.users),
    companyQueryKey(userPublicId, operations.userRole),
    companyQueryKey(userPublicId, operations.userSessions),
    companyQueryKey(userPublicId, operations.roles),
  ];
}

export function updatePerson(publicId: string, body: PersonUpdate) {
  return requestCompanyOperation(operations.updateUser, { params: { publicId }, body });
}

export function reissueInvitation(publicId: string) {
  return sendCompanyCommand(operations.reissueInvitation, { params: { publicId }, body: {} });
}

export function resetPersonPassword(publicId: string) {
  return sendCompanyCommand(operations.resetUserPassword, { params: { publicId }, body: {} });
}

export function deletePerson(publicId: string) {
  return sendCompanyCommand(operations.deleteUser, { params: { publicId } });
}

export function revokePersonSession(publicId: string, sessionPublicId: string) {
  return sendCompanyCommand(operations.revokeUserSession, {
    params: { publicId, sessionPublicId },
  });
}

export function assignPersonRole(publicId: string, rolePublicId: string) {
  return requestCompanyOperation(operations.assignUserRole, {
    params: { publicId },
    body: { rolePublicId },
  });
}

export function revokePersonRole(publicId: string) {
  return sendCompanyCommand(operations.revokeUserRole, { params: { publicId } });
}

export function transferOwnership(toUserPublicId: string) {
  return sendCompanyCommand(operations.transferOwnership, { body: { toUserPublicId } });
}
