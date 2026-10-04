import { notFound, redirect } from "@tanstack/react-router";
import { loadCompanyIdentity, loadPlatformIdentity } from "@/shared/api";
import {
  type AudienceName,
  hasEveryPermission,
  isPlatformPortalEnabled,
  type PermissionAction,
  projectRouteAccess,
  RouteAccessRefusal,
  safeReturnDestination,
  useCompanySession,
  useCurrentSession,
  usePlatformSession,
} from "@/shared/auth";

export { isPlatformPortalEnabled, useCurrentSession };
export function requirePlatformPortalEnabled() {
  if (!isPlatformPortalEnabled()) throw notFound();
}

interface AuthGuardOptions {
  audience?: AudienceName;
  requiredPermissions?: PermissionAction[];
  allowPasswordChange?: boolean;
  returnTo?: string;
}

export function redirectIfMustChangePassword(pathname: string) {
  const audience = pathname.startsWith("/company/")
    ? "company"
    : pathname.startsWith("/platform/")
      ? "platform"
      : null;
  if (!audience) return;
  const state =
    audience === "company" ? useCompanySession.getState() : usePlatformSession.getState();
  const decision = projectRouteAccess(pathname, {
    audience,
    authenticated: state.status === "authenticated" || state.status === "must_change_password",
    mustChangePassword: state.status === "must_change_password",
    platformEnabled: isPlatformPortalEnabled(),
    permissions: state.session?.user.permissions,
    owner: audience === "company" ? useCompanySession.getState().session?.user.isOwner : false,
  });
  if (decision === "credential-completion")
    throw redirect({
      to: audience === "company" ? "/company/change-password" : "/platform/change-password",
    });
}

export async function requireAuthenticated(options: AuthGuardOptions = {}) {
  const audience = options.audience ?? "company";
  if (audience === "platform") requirePlatformPortalEnabled();
  const pathname = options.returnTo?.split(/[?#]/)[0];
  if (
    pathname &&
    projectRouteAccess(pathname, { audience, platformEnabled: isPlatformPortalEnabled() }) ===
      "not-found"
  )
    throw notFound();
  const store = audience === "company" ? useCompanySession : usePlatformSession;
  const state = store.getState();
  if (state.status === "hydrating" || state.status === "unavailable") {
    try {
      if (audience === "company")
        await useCompanySession.getState().revalidate(loadCompanyIdentity);
      else await usePlatformSession.getState().revalidate(loadPlatformIdentity);
    } catch {
      /* The selected audience boundary owns quarantine and manual retry. */
    }
  }
  const { session, status } = store.getState();
  const decision = pathname
    ? projectRouteAccess(pathname, {
        audience,
        authenticated: !!session,
        mustChangePassword: !options.allowPasswordChange && status === "must_change_password",
        platformEnabled: isPlatformPortalEnabled(),
        permissions: session?.user.permissions,
        owner: audience === "company" ? useCompanySession.getState().session?.user.isOwner : false,
      })
    : null;
  if (decision === "not-found") throw notFound();
  if (!session || status === "anonymous" || status === "expired")
    throw redirect({
      to: audience === "platform" ? "/platform/login" : "/company/login",
      search: { returnTo: safeReturnDestination(audience, options.returnTo) },
    });
  if (status !== "authenticated" && status !== "must_change_password") return null;
  if (decision === "forbidden") throw new RouteAccessRefusal(audience);
  if (
    !options.allowPasswordChange &&
    (session.user.mustChangePassword || status === "must_change_password")
  )
    throw redirect({
      to: audience === "platform" ? "/platform/change-password" : "/company/change-password",
    });
  if (
    options.requiredPermissions?.length &&
    !hasEveryPermission(session.user, options.requiredPermissions)
  )
    throw redirect({ to: "/forbidden" });
  return session;
}
