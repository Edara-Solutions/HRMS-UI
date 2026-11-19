import { loadCompanyIdentity, loginCompany } from "../api/company-api";
import { companyApiClient } from "../api/company-client";
import { operation as invitation } from "../api/generated/company/post-api-v1-company-auth-accept-invitation";
import { operation as login } from "../api/generated/company/post-api-v1-company-auth-login";
import { operation as logout } from "../api/generated/company/post-api-v1-company-auth-logout";
import { operation as logoutAll } from "../api/generated/company/post-api-v1-company-auth-logout-all";
import { operation as resetConfirm } from "../api/generated/company/post-api-v1-company-auth-password-reset-confirm";
import { operation as resetRequest } from "../api/generated/company/post-api-v1-company-auth-password-reset-request";
import { ContractViolation } from "../api/generated/runtime";
import { executeOperationRequest } from "../api/operation-request";
import { useCompanySession } from "../auth/company-session";

export const companyCredentialSchemas = {
  login: login.requestSchema.shape.body,
  invitation: invitation.requestSchema.shape.body,
  recovery: resetRequest.requestSchema.shape.body,
  reset: resetConfirm.requestSchema.shape.body,
};

export async function signInCompany(input: unknown) {
  const credentials = companyCredentialSchemas.login.parse(input);
  return useCompanySession.getState().authenticate(() => loginCompany(credentials));
}

export async function acceptCompanyInvitation(input: unknown) {
  const invitationInput = companyCredentialSchemas.invitation.parse(input);
  return useCompanySession.getState().authenticate(async () => {
    const result = await executeOperationRequest(companyApiClient, invitation, {
      body: invitationInput,
    });
    const tokens = invitation.responses["200"].parse(result);
    const { operation: me } = await import("../api/generated/company/get-api-v1-company-me");
    const identity = await executeOperationRequest(
      companyApiClient,
      me,
      {},
      { accessToken: tokens.accessToken },
    );
    const user = me.responses["200"].parse(identity);
    if (user.companyPublicId !== invitationInput.companyPublicId)
      throw new ContractViolation({
        audience: me.audience,
        key: me.key,
        status: 200,
        phase: "response",
      });
    return { ...tokens, user };
  });
}

export async function requestCompanyRecovery(input: unknown) {
  if (useCompanySession.getState().session) throw new Error("Sign out of this audience first.");
  await executeOperationRequest(companyApiClient, resetRequest, { body: input });
}

export async function confirmCompanyRecovery(input: unknown) {
  if (useCompanySession.getState().session) throw new Error("Sign out of this audience first.");
  await executeOperationRequest(companyApiClient, resetConfirm, { body: input });
}

export async function signOutCompany(allSessions = false): Promise<{ remoteConfirmed: boolean }> {
  const session = useCompanySession.getState().session;
  useCompanySession.getState().clearSession();
  if (!session) return { remoteConfirmed: false };
  try {
    await executeOperationRequest(
      companyApiClient,
      allSessions ? logoutAll : logout,
      {},
      { accessToken: session.accessToken },
    );
    return { remoteConfirmed: true };
  } catch {
    return { remoteConfirmed: false };
  }
}

export async function revalidateCompanySession() {
  await useCompanySession.getState().revalidate(loadCompanyIdentity);
}
