import { usePlatformSession } from "../auth/platform-session";
import { refreshPlatformTokens } from "../auth/platform-session-api";
import { type AudienceClient, createAudienceClient } from "./audience-client";

function currentSession() {
  const state = usePlatformSession.getState();
  return state.isCurrentGeneration(state.generation) ? state.session : null;
}

export const platformApiClient = createAudienceClient({
  audience: "platform",
  getAccessToken: () => currentSession()?.accessToken,
  getRefreshToken: () => currentSession()?.refreshToken,
  getSessionGeneration: () => usePlatformSession.getState().generation,
  refresh: refreshPlatformTokens,
  updateTokens: (tokens) => usePlatformSession.getState().updateTokens(tokens),
  clearSession: () => usePlatformSession.getState().clearSession(),
  markUnavailable: () => usePlatformSession.getState().setStatus("unavailable"),
  canReplayProtectedRead: () => usePlatformSession.getState().status === "authenticated",
  validateRefreshedIdentity: async () => {
    const { loadPlatformIdentity } = await import("./platform-api");
    // A /me-triggered refresh must not await the original /me revalidation itself.
    await usePlatformSession
      .getState()
      .revalidate(() => loadPlatformIdentity(true), { joinExisting: false });
  },
});

export const delegatedApiClient: AudienceClient = Object.assign(platformApiClient.extend({}), {
  audience: "delegated" as const,
});
