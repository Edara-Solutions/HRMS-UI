import { create } from "zustand";
import { persist } from "zustand/middleware";
import { dummyAuthenticatedSession } from "./fixtures";
import type { AuthSession, AuthStatus } from "./types";

interface AuthState {
  session: AuthSession | null;
  status: AuthStatus;
  signInWithDummySession: () => void;
  requirePasswordChange: () => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      session: null,
      status: "anonymous",
      signInWithDummySession: () =>
        set({
          session: dummyAuthenticatedSession,
          status: "authenticated",
        }),
      requirePasswordChange: () =>
        set({
          session: {
            ...dummyAuthenticatedSession,
            user: {
              ...dummyAuthenticatedSession.user,
              mustChangePassword: true,
            },
          },
          status: "must_change_password",
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
