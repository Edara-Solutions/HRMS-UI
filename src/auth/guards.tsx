import { redirect } from "@tanstack/react-router";
import type { PermissionAction } from "./permissions";
import { hasEveryPermission } from "./permissions";
import { useAuthStore } from "./store";

interface AuthGuardOptions {
  requiredPermissions?: PermissionAction[];
  platformAdminOnly?: boolean;
}

export function requireAuthenticated(options: AuthGuardOptions = {}) {
  const { session, status } = useAuthStore.getState();

  if (!session || status === "anonymous" || status === "expired") {
    throw redirect({ to: "/login" });
  }

  if (session.user.mustChangePassword || status === "must_change_password") {
    throw redirect({ to: "/change-password" });
  }

  if (options.platformAdminOnly && !hasEveryPermission(session.user, ["companies:read"])) {
    throw redirect({ to: "/company/dashboard" });
  }

  if (
    options.requiredPermissions?.length &&
    !hasEveryPermission(session.user, options.requiredPermissions)
  ) {
    throw redirect({ to: "/forbidden" });
  }

  return session;
}

export function useCurrentSession() {
  return useAuthStore((state) => state.session);
}
