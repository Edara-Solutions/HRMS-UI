import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthSession, AuthStatus } from "./types";

interface AuthState {
  session: AuthSession | null;
  status: AuthStatus;
  setSession: (session: AuthSession) => void;
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
