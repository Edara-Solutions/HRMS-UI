import type { z } from "zod";
import {
  platformPeopleOperations as operations,
  platformQueryKey,
  platformReadQuery,
  requestPlatformOperation,
  sendPlatformCommand,
} from "@/shared/api";

type Operations = typeof operations;
export type NewRole = z.input<Operations["createRole"]["requestSchema"]>["body"];
export type RoleUpdate = z.input<Operations["updateRole"]["requestSchema"]>["body"];

/** The whole Platform role catalogue; a role's detail is read from it, never a parallel shape. */
export function rolesQuery(userPublicId: string) {
  return platformReadQuery(userPublicId, operations.roles);
}

/** Everything a role change can make stale for this identity. */
export function roleRoots(userPublicId: string) {
  return [
    platformQueryKey(userPublicId, operations.roles),
    platformQueryKey(userPublicId, operations.assignments),
  ];
}

/** Creates a custom role; the backend refuses root-reserved or unknown actions. */
export function createRole(body: NewRole) {
  return requestPlatformOperation(operations.createRole, { body });
}

/** Changes a role's details or replaces its grants; only the sent fields change. */
export function updateRole(rolePublicId: string, body: RoleUpdate) {
  return requestPlatformOperation(operations.updateRole, { params: { rolePublicId }, body });
}

/** Deletes a custom role that nobody holds. */
export function deleteRole(rolePublicId: string) {
  return sendPlatformCommand(operations.deleteRole, { params: { rolePublicId } });
}
