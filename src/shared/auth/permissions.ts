import type { SessionUser } from "./auth-session";

const permissionActions = [
  "users:create",
  "users:read",
  "users:update",
  "users:delete",
  "users:reset-password",
  "roles:create",
  "roles:read",
  "roles:update",
  "roles:delete",
  "roles:assign",
  "sessions:read",
  "sessions:revoke",
  "companies:read",
  "companies:update",
  "companies:email-readiness:read",
  "companies:email-settings:read",
  "companies:email-settings:update",
  "sending-domains:read",
  "sending-domains:manage",
  "audit:read",
  "REQUEST_LEAD_CONVERSION",
  "AUTO_APPROVE_LEAD_CONVERSION",
  "APPROVE_LEAD_CONVERSION_REQUEST",
] as const;

export type PermissionAction = (typeof permissionActions)[number];

export function hasPermission(user: SessionUser | null | undefined, action: PermissionAction) {
  if (!user) {
    return false;
  }

  return user.isPlatformAdmin || user.isOwner || user.permissions.includes(action);
}

export function hasEveryPermission(
  user: SessionUser | null | undefined,
  actions: PermissionAction[],
) {
  return actions.every((action) => hasPermission(user, action));
}
