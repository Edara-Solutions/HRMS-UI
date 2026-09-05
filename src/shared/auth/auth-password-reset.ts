import { useMutation } from "@tanstack/react-query";
import { apiClient } from "../api/client";
import type {
  AdminPasswordResetRequest,
  PasswordResetRequest,
  ResetPasswordInput,
} from "./auth-session";

/**
 * Requesting a reset never signs anyone in and never reports whether the address exists — the
 * backend answers a stranger and an account holder identically on purpose. There is nothing to
 * cache and no session to touch, so these are plain mutations.
 */
export function useRequestPasswordReset() {
  return useMutation({
    mutationFn: async (input: PasswordResetRequest): Promise<void> => {
      await apiClient.post("auth/password-reset/request", { json: input }).json();
    },
  });
}

export function useRequestAdminPasswordReset() {
  return useMutation({
    mutationFn: async (input: AdminPasswordResetRequest): Promise<void> => {
      await apiClient.post("auth/admin/password-reset/request", { json: input }).json();
    },
  });
}

/**
 * Redeeming a link sets the password and revokes every session; it deliberately returns no tokens,
 * so the holder signs in afresh with the password they just chose.
 */
export function useResetPassword() {
  return useMutation({
    mutationFn: async (input: ResetPasswordInput): Promise<void> => {
      await apiClient.post("auth/password-reset/confirm", { json: input }).json();
    },
  });
}
