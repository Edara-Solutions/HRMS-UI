import ky from "ky";
import type { LoginTokens } from "@/auth/types";
import { apiBaseUrl } from "./config";

const refreshClient = ky.create({
  prefixUrl: apiBaseUrl,
  headers: {
    "Content-Type": "application/json",
  },
});

let refreshPromise: Promise<LoginTokens> | null = null;

export async function refreshTokensOnce(refreshToken: string): Promise<LoginTokens> {
  if (!refreshPromise) {
    refreshPromise = refreshClient
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
