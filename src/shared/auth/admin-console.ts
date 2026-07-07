/**
 * Build-time seam (PRD: VITE_ENABLE_ADMIN) so the tenant build can exclude the
 * operator console entirely. The full separate-subdomain/deployment split is
 * deferred - for now this flag governs route reachability and UI affordances.
 */
export function isAdminConsoleEnabled() {
  return import.meta.env.VITE_ENABLE_ADMIN === "true";
}
