import { useAuthStore } from "@/auth/store";
import ky from "ky";
import { refreshTokensOnce } from "./auth-interceptor";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000/api/v1";

const publicPaths = new Set([
  "auth/login",
  "auth/admin/login",
  "auth/refresh",
  "auth/accept-invitation",
  "health",
]);

const retriedHeader = "X-Retried-After-Refresh";

function isPublicPath(input: RequestInfo | URL) {
  const url = typeof input === "string" ? input : input.toString();
  return [...publicPaths].some((path) => url.includes(path));
}

export const apiClient = ky.create({
  prefixUrl: apiBaseUrl,
  headers: {
    "Content-Type": "application/json",
  },
  hooks: {
    beforeRequest: [
      (request) => {
        if (isPublicPath(request.url) || request.headers.has("Authorization")) {
          return;
        }

        const token = useAuthStore.getState().session?.accessToken;

        if (token) {
          request.headers.set("Authorization", `Bearer ${token}`);
        }
      },
    ],
    afterResponse: [
      async (request, options, response) => {
        if (
          response.status !== 401 ||
          isPublicPath(request.url) ||
          request.headers.has(retriedHeader)
        ) {
          return;
        }

        const session = useAuthStore.getState().session;

        if (!session) {
          return;
        }

        try {
          const tokens = await refreshTokensOnce(session.refreshToken);
          useAuthStore.getState().updateTokens(tokens);

          const retriedRequest = request.clone();
          retriedRequest.headers.set("Authorization", `Bearer ${tokens.accessToken}`);
          retriedRequest.headers.set(retriedHeader, "true");

          return ky(retriedRequest, options);
        } catch {
          useAuthStore.getState().clearSession();
          window.location.assign("/login");
        }
      },
    ],
  },
});
