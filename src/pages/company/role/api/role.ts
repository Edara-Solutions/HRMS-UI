import { queryOptions } from "@tanstack/react-query";
import {
  companyQueryKey,
  companyPeopleOperations as operations,
  requestCompanyOperation,
  sendCompanyCommand,
} from "@/shared/api";

export function roleQueries(userPublicId: string, publicId: string) {
  return {
    role: queryOptions({
      queryKey: companyQueryKey(userPublicId, operations.role, publicId),
      queryFn: ({ signal }) =>
        requestCompanyOperation(operations.role, { params: { publicId } }, signal),
    }),
    /** The Company permission catalogue is the only source of grantable permissions. */
    catalogue: queryOptions({
      queryKey: companyQueryKey(userPublicId, operations.permissionCatalogue),
      queryFn: ({ signal }) => requestCompanyOperation(operations.permissionCatalogue, {}, signal),
      staleTime: 5 * 60_000,
    }),
  };
}

export function roleRoots(userPublicId: string) {
  return [
    companyQueryKey(userPublicId, operations.role),
    companyQueryKey(userPublicId, operations.roles),
    companyQueryKey(userPublicId, operations.userRole),
  ];
}

export function updateRole(publicId: string, body: { name?: string; description?: string | null }) {
  return requestCompanyOperation(operations.updateRole, { params: { publicId }, body });
}

export function replaceRolePermissions(publicId: string, permissionIds: readonly string[]) {
  return requestCompanyOperation(operations.replaceRolePermissions, {
    params: { publicId },
    body: { permissionIds: [...permissionIds] },
  });
}

export function deleteRole(publicId: string) {
  return sendCompanyCommand(operations.deleteRole, { params: { publicId } });
}
