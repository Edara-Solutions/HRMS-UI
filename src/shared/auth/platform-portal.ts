/** A disabled Platform build conceals its routes; this flag never grants authentication. */
export function isPlatformPortalEnabled() {
  return import.meta.env.VITE_ENABLE_PLATFORM_PORTAL === "true";
}
