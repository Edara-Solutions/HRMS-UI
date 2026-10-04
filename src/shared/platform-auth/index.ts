import { operation as invitation } from "../api/generated/platform/post-api-v1-platform-auth-accept-invitation";
import { operation as login } from "../api/generated/platform/post-api-v1-platform-auth-login";
import { operation as logout } from "../api/generated/platform/post-api-v1-platform-auth-logout";
import { operation as logoutAll } from "../api/generated/platform/post-api-v1-platform-auth-logout-all";
import { operation as resetConfirm } from "../api/generated/platform/post-api-v1-platform-auth-password-reset-confirm";
import { operation as resetRequest } from "../api/generated/platform/post-api-v1-platform-auth-password-reset-request";
import { executeOperationRequest } from "../api/operation-request";
import { loadPlatformIdentity, loginPlatform } from "../api/platform-api";
import { platformApiClient } from "../api/platform-client";
import { usePlatformSession } from "../auth/platform-session";

export const platformCredentialSchemas = {
  login: login.requestSchema.shape.body,
  invitation: invitation.requestSchema.shape.body,
  recovery: resetRequest.requestSchema.shape.body,
  reset: resetConfirm.requestSchema.shape.body,
};

export async function signInPlatform(input: unknown) {
  const credentials = platformCredentialSchemas.login.parse(input);
  return usePlatformSession.getState().authenticate(() => loginPlatform(credentials));
}

export async function acceptPlatformInvitation(input: unknown) {
  return usePlatformSession.getState().authenticate(async () => {
    const result = await executeOperationRequest(platformApiClient, invitation, { body: input });
    const tokens = invitation.responses["200"].parse(result);
    const { operation: me } = await import("../api/generated/platform/get-api-v1-platform-me");
    const identity = await executeOperationRequest(
      platformApiClient,
      me,
      {},
      { accessToken: tokens.accessToken },
    );
    const user = me.responses["200"].parse(identity);
    return { ...tokens, user };
  });
}

export async function requestPlatformRecovery(input: unknown) {
  if (usePlatformSession.getState().session) throw new Error("Sign out of this audience first.");
  await executeOperationRequest(platformApiClient, resetRequest, { body: input });
}

export async function confirmPlatformRecovery(input: unknown) {
  if (usePlatformSession.getState().session) throw new Error("Sign out of this audience first.");
  await executeOperationRequest(platformApiClient, resetConfirm, { body: input });
}

export async function signOutPlatform(allSessions = false): Promise<{ remoteConfirmed: boolean }> {
  const session = usePlatformSession.getState().session;
  usePlatformSession.getState().clearSession();
  if (!session) return { remoteConfirmed: false };
  try {
    await executeOperationRequest(
      platformApiClient,
      allSessions ? logoutAll : logout,
      {},
      { accessToken: session.accessToken },
    );
    return { remoteConfirmed: true };
  } catch {
    return { remoteConfirmed: false };
  }
}

export async function revalidatePlatformSession() {
  await usePlatformSession.getState().revalidate(loadPlatformIdentity);
}
