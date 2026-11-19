import type { OperationPermission } from "@/shared/api/generated/authorization";

interface PermissionUser {
  permissions: readonly string[];
}
export type PermissionAction = OperationPermission;
export function hasPermission(user: PermissionUser | null | undefined, action: string) {
  return !!user && user.permissions.includes(action);
}
export function hasEveryPermission(
  user: PermissionUser | null | undefined,
  actions: readonly string[],
) {
  return actions.every((action) => hasPermission(user, action));
}
