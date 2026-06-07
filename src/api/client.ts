import { useAuthStore } from "@/auth/store";
import ky from "ky";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000/api/v1";

const publicPaths = new Set(["auth/login", "auth/refresh", "auth/accept-invitation", "health"]);

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
  },
});
