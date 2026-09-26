import type { PlatformSession } from "../auth/platform-session";
import { usePlatformSession } from "../auth/platform-session";
import { operation as platformMe } from "./generated/platform/get-api-v1-platform-me";
import type { Request as PlatformLoginRequest } from "./generated/platform/post-api-v1-platform-auth-login";
import { operation as platformLogin } from "./generated/platform/post-api-v1-platform-auth-login";
import { ContractViolation } from "./generated/runtime";
import { executeOperationRequest } from "./operation-request";
import { platformApiClient } from "./platform-client";

export { platformApiClient as platformApi } from "./platform-client";

export async function loadPlatformIdentity(skipRefresh = false) {
  const expected = usePlatformSession.getState().session?.user;
  const body = await executeOperationRequest(platformApiClient, platformMe, {}, { skipRefresh });
  const user = platformMe.responses["200"].parse(body);
  if (expected && user.publicId !== expected.publicId)
    throw new ContractViolation({
      audience: platformMe.audience,
      key: platformMe.key,
      status: 200,
      phase: "response",
    });
  return user;
}

export async function loginPlatform(
  credentials: PlatformLoginRequest["body"],
): Promise<PlatformSession> {
  const tokenBody = await executeOperationRequest(platformApiClient, platformLogin, {
    body: { ...credentials, clientType: "web" },
  });
  const tokens = platformLogin.responses["200"].parse(tokenBody);
  const meBody = await executeOperationRequest(
    platformApiClient,
    platformMe,
    {},
    {
      accessToken: tokens.accessToken,
    },
  );
  const user = platformMe.responses["200"].parse(meBody);
  return { ...tokens, user };
}
