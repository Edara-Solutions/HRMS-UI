import type { SuccessResponse as PlatformRefreshResponse } from "@/shared/api/generated/platform/post-api-v1-platform-auth-refresh";
import { operation as refreshOperation } from "@/shared/api/generated/platform/post-api-v1-platform-auth-refresh";
import { platformApiClient } from "@/shared/api/platform-client";
import { executeOperationRequest } from "../api/operation-request";

export async function refreshPlatformTokens(
  refreshToken: string,
): Promise<PlatformRefreshResponse> {
  const body = await executeOperationRequest(platformApiClient, refreshOperation, {
    body: { refreshToken },
  });
  return refreshOperation.responses["200"].parse(body);
}
