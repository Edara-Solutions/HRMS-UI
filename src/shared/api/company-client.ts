import { useCompanySession } from "../auth/company-session";
import { refreshCompanyTokens } from "../auth/company-session-api";
import { createAudienceClient } from "./audience-client";

function currentSession() {
  const state = useCompanySession.getState();
  return state.isCurrentGeneration(state.generation) ? state.session : null;
}

export const companyApiClient = createAudienceClient({
  audience: "company",
  getAccessToken: () => currentSession()?.accessToken,
  getRefreshToken: () => currentSession()?.refreshToken,
  getSessionGeneration: () => useCompanySession.getState().generation,
  refresh: refreshCompanyTokens,
  updateTokens: (tokens) => useCompanySession.getState().updateTokens(tokens),
  clearSession: () => useCompanySession.getState().clearSession(),
  markUnavailable: () => useCompanySession.getState().setStatus("unavailable"),
  canReplayProtectedRead: () => useCompanySession.getState().status === "authenticated",
  validateRefreshedIdentity: async () => {
    const { loadCompanyIdentity } = await import("./company-api");
    // A /me-triggered refresh must not await the original /me revalidation itself.
    await useCompanySession
      .getState()
      .revalidate(() => loadCompanyIdentity(true), { joinExisting: false });
  },
});
