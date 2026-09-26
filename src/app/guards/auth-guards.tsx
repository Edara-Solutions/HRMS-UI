import { notFound, redirect } from "@tanstack/react-router";
import { loadCompanyIdentity, loadPlatformIdentity } from "@/shared/api";
import {
  hasEveryPermission,
  isPlatformPortalEnabled,
  type PermissionAction,
  safeReturnDestination,
  useCompanySession,
  useCurrentSession,
  usePlatformSession,
} from "@/shared/auth";

export { isPlatformPortalEnabled, useCurrentSession };

/** With the flag off, operator routes 404 as if they don't exist in this build. */
export function requirePlatformPortalEnabled() {
  if (!isPlatformPortalEnabled()) {
    throw notFound();
  }
}

// Removed with the old route tree in the immediately following atomic namespace slice.
export const requireAdminConsoleEnabled = requirePlatformPortalEnabled;

interface AuthGuardOptions {
  requiredPermissions?: PermissionAction[];
  platformAdminOnly?: boolean;
  allowPasswordChange?: boolean;
  returnTo?: string;
}

const PASSWORD_CHANGE_EXEMPT_PATHS = new Set([
  "/login",
  "/admin/login",
  "/change-password",
  "/accept-invitation",
  "/plans",
  "/plans/",
]);

/**
 * Enforce only a validated password gate in the requested audience.
 * Quarantined persisted identity is revalidated by the protected route guard.
 */
export function redirectIfMustChangePassword(pathname: string) {
  if (
    /^\/(company|platform)\/(login|accept-invitation|forgot-password|reset-password|change-password)\/?$/.test(
      pathname,
    )
  )
    return;
  const state = pathname.startsWith("/company/")
    ? useCompanySession.getState()
    : pathname.startsWith("/admin/") || pathname.startsWith("/platform/")
      ? usePlatformSession.getState()
      : null;

  if (state?.status === "must_change_password" && !PASSWORD_CHANGE_EXEMPT_PATHS.has(pathname)) {
    throw redirect({
      to: pathname.startsWith("/company/")
        ? "/company/change-password"
        : "/platform/change-password",
    });
  }
}

export async function requireAuthenticated(options: AuthGuardOptions = {}) {
  if (options.platformAdminOnly) {
    const state = usePlatformSession.getState();
    if (state.status === "hydrating" || state.status === "unavailable") {
      try {
        await state.revalidate(loadPlatformIdentity);
      } catch {
        // The audience boundary owns retry UI while the persisted slot remains quarantined.
      }
    }
  } else {
    const state = useCompanySession.getState();
    if (state.status === "hydrating" || state.status === "unavailable") {
      try {
        await state.revalidate(loadCompanyIdentity);
      } catch {
        // The audience boundary owns retry UI while the persisted slot remains quarantined.
      }
    }
  }
  const audienceState = options.platformAdminOnly
    ? usePlatformSession.getState()
    : useCompanySession.getState();
  const { session, status } = audienceState;

  if (!session || status === "anonymous" || status === "expired") {
    throw redirect({
      to: options.platformAdminOnly ? "/platform/login" : "/company/login",
      search: {
        returnTo: safeReturnDestination(
          options.platformAdminOnly ? "platform" : "company",
          options.returnTo,
        ),
      },
    });
  }

  if (status !== "authenticated" && status !== "must_change_password") {
    return null;
  }

  if (
    !options.allowPasswordChange &&
    (session.user.mustChangePassword || status === "must_change_password")
  ) {
    throw redirect({
      to: options.platformAdminOnly ? "/platform/change-password" : "/company/change-password",
    });
  }

  if (
    options.requiredPermissions?.length &&
    !hasEveryPermission(session.user, options.requiredPermissions)
  ) {
    throw redirect({ to: "/forbidden" });
  }

  return session;
}
