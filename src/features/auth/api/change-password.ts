import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/shared/api";
import { useAuthStore } from "@/shared/auth";
import type { ChangePasswordInput } from "@/shared/auth";

async function changePassword(input: ChangePasswordInput): Promise<void> {
  await apiClient.post("auth/change-password", { json: input }).json();
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
