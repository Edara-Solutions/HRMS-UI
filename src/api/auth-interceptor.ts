import type { LoginTokens } from "@/auth/types";
import { apiClient } from "./client";

let refreshPromise: Promise<LoginTokens> | null = null;

export async function refreshTokensOnce(refreshToken: string): Promise<LoginTokens> {
  if (!refreshPromise) {
    refreshPromise = apiClient
      .post("auth/refresh", {
        json: { refreshToken },
      })
      .json<LoginTokens>()
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}
