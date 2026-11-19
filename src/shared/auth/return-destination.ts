import type { AudienceName } from "./audience-session";

const credentialRoutes = new Set([
  "login",
  "accept-invitation",
  "password-reset",
  "forgot-password",
  "reset-password",
  "change-password",
]);

export function safeReturnDestination(audience: AudienceName, destination: unknown): string {
  const fallback = `/${audience}/dashboard`;
  if (
    typeof destination !== "string" ||
    destination.length > 2048 ||
    !destination.startsWith(`/${audience}/`)
  )
    return fallback;
  const pathname = destination.split(/[?#]/, 1)[0];
  if (
    !pathname ||
    /[\\\s]/.test(pathname) ||
    Array.from(pathname).some(
      (character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
    )
  )
    return fallback;
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return fallback;
  }
  // Reject remaining escapes instead of permitting double-encoded traversal or separators.
  if (decoded.includes("%") || decoded !== pathname || decoded.includes("//")) return fallback;
  const segments = decoded.split("/");
  if (segments.some((segment) => segment === "." || segment === "..")) return fallback;
  if (credentialRoutes.has(segments[2] ?? "")) return fallback;
  return decoded.replace(/\/$/, "");
}
