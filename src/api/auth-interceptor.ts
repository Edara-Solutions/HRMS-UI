import { apiClient } from "./client";

let refreshPromise: Promise<unknown> | null = null;

export async function refreshTokensOnce(refreshToken: string) {
  if (!refreshPromise) {
    refreshPromise = apiClient
      .post("auth/refresh", {
        json: { refreshToken },
      })
      .json()
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}
