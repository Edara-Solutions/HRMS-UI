import { redirect } from "@tanstack/react-router";
import type { PermissionAction } from "./permissions";
import { hasEveryPermission } from "./permissions";
import { useAuthStore } from "./store";

interface AuthGuardOptions {
  requiredPermissions?: PermissionAction[];
  platformAdminOnly?: boolean;
}

const PASSWORD_CHANGE_EXEMPT_PATHS = new Set([
  "/login",
  "/admin/login",
  "/change-password",
  "/accept-invitation",
]);

/**
 * Root-level layer of the forced password change enforcement: redirects any
 * route — not just the authenticated portals — to /change-password while the
 * session requires it, so the gate cannot be bypassed by navigating to an
 * unguarded path (e.g. the public landing page).
 */
export function redirectIfMustChangePassword(pathname: string) {
  const { session } = useAuthStore.getState();

  if (session?.user.mustChangePassword && !PASSWORD_CHANGE_EXEMPT_PATHS.has(pathname)) {
    throw redirect({ to: "/change-password" });
  }
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
