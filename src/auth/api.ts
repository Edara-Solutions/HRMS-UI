import { apiClient } from "@/api/client";
import { useMutation } from "@tanstack/react-query";
import { useAuthStore } from "./store";
import type {
  AuthSession,
  ChangePasswordInput,
  LoginCredentials,
  LoginTokens,
  SessionUser,
} from "./types";

async function login(credentials: LoginCredentials): Promise<LoginTokens> {
  return apiClient.post("auth/login", { json: credentials }).json();
}

async function fetchMe(accessToken: string): Promise<SessionUser> {
  return apiClient.get("auth/me", { headers: { Authorization: `Bearer ${accessToken}` } }).json();
}

async function changePassword(input: ChangePasswordInput): Promise<void> {
  await apiClient.post("auth/change-password", { json: input }).json();
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

export function useChangePassword() {
  const clearSession = useAuthStore((state) => state.clearSession);

  return useMutation({
    mutationFn: async (input: ChangePasswordInput): Promise<void> => {
      const session = useAuthStore.getState().session;
      if (!session) {
        throw new Error("No active session");
      }

      await changePassword(input);
      clearSession();
    },
  });
}
