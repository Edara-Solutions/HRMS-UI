import { loadCompanyIdentity } from "../api/company-api";
import { companyApiClient } from "../api/company-client";
import { operation as revoke } from "../api/generated/company/delete-api-v1-company-me-sessions-sessionid";
import { operation as profile } from "../api/generated/company/get-api-v1-company-me-profile";
import { operation as sessions } from "../api/generated/company/get-api-v1-company-me-sessions";
import { operation as updateProfile } from "../api/generated/company/patch-api-v1-company-me-profile";
import { operation as email } from "../api/generated/company/post-api-v1-company-me-email";
import { executeOperationRequest, type RequestContract } from "../api/operation-request";
import { useCompanySession } from "../auth/company-session";

export const companySelfSchemas = {
  profile: updateProfile.requestSchema.shape.body,
  email: email.requestSchema.shape.body,
};

async function request(operation: RequestContract, input: unknown, signal?: AbortSignal) {
  const state = useCompanySession.getState();
  const { generation, session, status } = state;
  if (!session || status !== "authenticated" || !state.isCurrentGeneration(generation))
    throw new Error("Session unavailable");
  const result = await executeOperationRequest(companyApiClient, operation, input, { signal });
  if (!useCompanySession.getState().isCurrentGeneration(generation))
    throw new Error("Session changed");
  return result;
}

export async function readCompanyProfile(signal?: AbortSignal) {
  return profile.responses["200"].parse(await request(profile, {}, signal));
}

export async function updateCompanyProfile(input: unknown) {
  const result = updateProfile.responses["200"].parse(
    await request(updateProfile, { body: input }),
  );
  await useCompanySession.getState().revalidate(loadCompanyIdentity);
  return result;
}

export async function changeCompanyEmail(input: unknown) {
  const generation = useCompanySession.getState().generation;
  try {
    await request(email, { body: input });
  } finally {
    if (useCompanySession.getState().isCurrentGeneration(generation))
      await useCompanySession.getState().revalidate(loadCompanyIdentity);
  }
}

export async function readCompanySessions(page: number, signal?: AbortSignal) {
  return sessions.responses["200"].parse(
    await request(sessions, { query: { page, pageSize: 20 } }, signal),
  );
}

export async function revokeCompanySession(sessionId: string) {
  await request(revoke, { params: { sessionId } });
  if (useCompanySession.getState().session?.sessionId === sessionId)
    useCompanySession.getState().clearSession();
}
