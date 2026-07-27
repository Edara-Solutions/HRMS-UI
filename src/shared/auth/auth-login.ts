import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../api/client";
import type {
  AcceptInvitationInput,
  AdminLoginCredentials,
  AuthSession,
  LoginCredentials,
  LoginTokens,
  SessionUser,
} from "./auth-session";
import { loginTokensSchema, sessionUserSchema } from "./auth-session";
import { useAuthStore } from "./auth-store";

async function login(credentials: LoginCredentials): Promise<LoginTokens> {
  const response: unknown = await apiClient.post("auth/login", { json: credentials }).json();
  return loginTokensSchema.parse(response);
}

async function adminLogin(credentials: AdminLoginCredentials): Promise<LoginTokens> {
  const response: unknown = await apiClient.post("auth/admin/login", { json: credentials }).json();
  return loginTokensSchema.parse(response);
}

async function acceptInvitation(input: AcceptInvitationInput): Promise<LoginTokens> {
  const response: unknown = await apiClient.post("auth/accept-invitation", { json: input }).json();
  return loginTokensSchema.parse(response);
}

async function fetchMe(accessToken: string): Promise<SessionUser> {
  const response: unknown = await apiClient
    .get("auth/me", { headers: { Authorization: `Bearer ${accessToken}` } })
    .json();
  return sessionUserSchema.parse(response);
}

export function useLogin() {
  const queryClient = useQueryClient();
  const setSession = useAuthStore((state) => state.setSession);

  return useMutation({
    mutationFn: async (credentials: LoginCredentials): Promise<AuthSession> => {
      const tokens = await login(credentials);
      const user = await fetchMe(tokens.accessToken);
      const session: AuthSession = { ...tokens, user };
      setSession(session);
      return session;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [] });
    },
  });
}

export function useAcceptInvitation() {
  const queryClient = useQueryClient();
  const setSession = useAuthStore((state) => state.setSession);

  return useMutation({
    mutationFn: async (input: AcceptInvitationInput): Promise<AuthSession> => {
      const tokens = await acceptInvitation(input);
      const user = await fetchMe(tokens.accessToken);
      const session: AuthSession = { ...tokens, user };
      setSession(session);
      return session;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [] });
    },
  });
}

export function useAdminLogin() {
  const queryClient = useQueryClient();
  const setSession = useAuthStore((state) => state.setSession);

  return useMutation({
    mutationFn: async (credentials: AdminLoginCredentials): Promise<AuthSession> => {
      const tokens = await adminLogin(credentials);
      const user = await fetchMe(tokens.accessToken);
      const session: AuthSession = { ...tokens, user };
      setSession(session);
      return session;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [] });
    },
  });
}
