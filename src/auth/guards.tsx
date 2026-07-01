import { notFound, redirect } from "@tanstack/react-router";
import type { PermissionAction } from "./permissions";
import { hasEveryPermission } from "./permissions";
import { useAuthStore } from "./store";

/**
 * Build-time seam (PRD: VITE_ENABLE_ADMIN) so the tenant build can exclude the
 * operator console entirely. The full separate-subdomain/deployment split is
 * deferred — for now this flag governs route reachability and UI affordances.
 */
export function isAdminConsoleEnabled() {
  return import.meta.env.VITE_ENABLE_ADMIN === "true";
}

/** With the flag off, operator routes 404 as if they don't exist in this build. */
export function requireAdminConsoleEnabled() {
  if (!isAdminConsoleEnabled()) {
    throw notFound();
  }
}

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

  if (options.platformAdminOnly && !session.user.isPlatformAdmin) {
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
