import { operation as profile } from "../api/generated/platform/get-api-v1-platform-me-profile";
import { operation as sessions } from "../api/generated/platform/get-api-v1-platform-me-sessions";
import { operation as updateProfile } from "../api/generated/platform/patch-api-v1-platform-me-profile";
import { operation as email } from "../api/generated/platform/post-api-v1-platform-me-email";
import { executeOperationRequest, type RequestContract } from "../api/operation-request";
import { loadPlatformIdentity } from "../api/platform-api";
import { platformApiClient } from "../api/platform-client";
import { usePlatformSession } from "../auth/platform-session";

export const platformSelfSchemas = {
  profile: updateProfile.requestSchema.shape.body,
  email: email.requestSchema.shape.body,
};

async function request(operation: RequestContract, input: unknown, signal?: AbortSignal) {
  const state = usePlatformSession.getState();
  const { generation, session, status } = state;
  if (!session || status !== "authenticated" || !state.isCurrentGeneration(generation))
    throw new Error("Session unavailable");
  const result = await executeOperationRequest(platformApiClient, operation, input, { signal });
  if (!usePlatformSession.getState().isCurrentGeneration(generation))
    throw new Error("Session changed");
  return result;
}

export async function readPlatformProfile(signal?: AbortSignal) {
  return profile.responses["200"].parse(await request(profile, {}, signal));
}

export async function updatePlatformProfile(input: unknown) {
  const result = updateProfile.responses["200"].parse(
    await request(updateProfile, { body: input }),
  );
  await usePlatformSession.getState().revalidate(loadPlatformIdentity);
  return result;
}

export async function changePlatformEmail(input: unknown) {
  const generation = usePlatformSession.getState().generation;
  try {
    await request(email, { body: input });
  } finally {
    if (usePlatformSession.getState().isCurrentGeneration(generation))
      await usePlatformSession.getState().revalidate(loadPlatformIdentity);
  }
}

export async function readPlatformSessions(page: number, signal?: AbortSignal) {
  return sessions.responses["200"].parse(
    await request(sessions, { query: { page, pageSize: 20 } }, signal),
  );
}
