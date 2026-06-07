import { apiClient } from "@/api/client";
import { useMutation } from "@tanstack/react-query";
import { useAuthStore } from "./store";
import type { AuthSession, LoginCredentials, LoginTokens, SessionUser } from "./types";

async function login(credentials: LoginCredentials): Promise<LoginTokens> {
  return apiClient.post("auth/login", { json: credentials }).json();
}

async function fetchMe(accessToken: string): Promise<SessionUser> {
  return apiClient.get("auth/me", { headers: { Authorization: `Bearer ${accessToken}` } }).json();
}

export function useLogin() {
  const setSession = useAuthStore((state) => state.setSession);

  return useMutation({
    mutationFn: async (credentials: LoginCredentials): Promise<AuthSession> => {
      const tokens = await login(credentials);
      const user = await fetchMe(tokens.accessToken);
      const session: AuthSession = { ...tokens, user };
      setSession(session);
      return session;
    },
  });
}
