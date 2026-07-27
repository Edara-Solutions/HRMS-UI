import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/shared/api";
import type { AuthSession, ChangePasswordInput, SessionUser } from "@/shared/auth";
import { sessionUserSchema, useAuthStore } from "@/shared/auth";

async function changePassword(input: ChangePasswordInput): Promise<void> {
  await apiClient.post("auth/change-password", { json: input }).json();
}

async function fetchMe(accessToken: string): Promise<SessionUser> {
  const response: unknown = await apiClient
    .get("auth/me", { headers: { Authorization: `Bearer ${accessToken}` } })
    .json();
  return sessionUserSchema.parse(response);
}

export function useChangePassword() {
  const queryClient = useQueryClient();
  const setSession = useAuthStore((state) => state.setSession);

  return useMutation({
    mutationFn: async (input: ChangePasswordInput): Promise<AuthSession> => {
      const session = useAuthStore.getState().session;
      if (!session) {
        throw new Error("No active session");
      }

      await changePassword(input);
      const user = await fetchMe(session.accessToken);
      const updatedSession: AuthSession = { ...session, user };
      setSession(updatedSession);
      return updatedSession;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [] });
    },
  });
}
