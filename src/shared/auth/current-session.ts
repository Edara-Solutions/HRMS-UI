import { useCurrentAudience } from "./audience-context";
import type { AudienceName } from "./audience-session";
import type { CompanySession } from "./company-session";
import type { PlatformSession } from "./platform-session";
import { useAudienceSession } from "./use-audience-session";

export function useCurrentSession(audience: "company"): CompanySession | null;
export function useCurrentSession(audience: "platform"): PlatformSession | null;
export function useCurrentSession(): CompanySession | PlatformSession | null;
export function useCurrentSession(selectedAudience?: AudienceName) {
  const contextAudience = useCurrentAudience();
  const audience = selectedAudience ?? contextAudience;
  const state = useAudienceSession(audience ?? "company");
  if (contextAudience && selectedAudience && contextAudience !== selectedAudience) return null;
  if (!audience) return null;
  return state.status === "authenticated" || state.status === "must_change_password"
    ? state.session
    : null;
}
