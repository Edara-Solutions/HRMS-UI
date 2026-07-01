import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthSession, AuthStatus, LoginTokens } from "./types";

interface AuthState {
  session: AuthSession | null;
  status: AuthStatus;
  setSession: (session: AuthSession) => void;
  updateTokens: (tokens: LoginTokens) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      session: null,
      status: "anonymous",
      setSession: (session) =>
        set({
          session,
          status: session.user.mustChangePassword ? "must_change_password" : "authenticated",
        }),
      updateTokens: (tokens) =>
        set((state) => (state.session ? { session: { ...state.session, ...tokens } } : state)),
      clearSession: () =>
        set({
          session: null,
          status: "anonymous",
        }),
    }),
    {
      name: "hrms-auth",
      partialize: (state) => ({
        session: state.session,
        status: state.status,
      }),
    },
  ),
);
