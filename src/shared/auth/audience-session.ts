import { z } from "zod";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { SuccessResponse as LoginTokens } from "../api/generated/company/post-api-v1-company-auth-login";
import type { SuccessResponse as PlatformLoginTokens } from "../api/generated/platform/post-api-v1-platform-auth-login";

export type AudienceName = "company" | "platform";
export type AudienceTokens = LoginTokens | PlatformLoginTokens;
export type AudienceSession<User> = AudienceTokens & { user: User };
export type AudienceStatus =
  | "anonymous"
  | "hydrating"
  | "unavailable"
  | "authenticating"
  | "authenticated"
  | "must_change_password"
  | "refreshing"
  | "expired"
  | "forbidden";
export type SessionStatus = AudienceStatus;

interface RevalidationOptions {
  joinExisting?: boolean;
}

const persistedGenerationSchema = z.object({
  version: z.literal(1),
  state: z.object({ audience: z.string(), generation: z.string() }),
});

export interface AudienceSessionState<User extends { mustChangePassword: boolean }> {
  generation: string;
  eventKind: "replacement" | "rotation" | "logout";
  session: AudienceSession<User> | null;
  status: AudienceStatus;
  setSession: (session: AudienceSession<User>) => void;
  updateTokens: (tokens: AudienceTokens) => void;
  clearSession: () => void;
  setStatus: (status: AudienceStatus) => void;
  setAuthenticating: () => number;
  isCurrentAttempt: (attempt: number) => boolean;
  isCurrentGeneration: (generation: string) => boolean;
  revalidate: (loadUser: () => Promise<User>, options?: RevalidationOptions) => Promise<void>;
  authenticate: (
    loadSession: () => Promise<AudienceSession<User>>,
  ) => Promise<AudienceSession<User>>;
  stopStorageSync: () => void;
}

export function createAudienceSessionStore<User extends { mustChangePassword: boolean }>(
  audience: AudienceName,
  storageKey: string,
  sessionSchema?: z.ZodType<AudienceSession<User>>,
  clearIdentityCache: () => void = () => {},
) {
  const persistedSessionSchema = sessionSchema
    ? z
        .object({
          audience: z.literal(audience),
          generation: z.string().min(1),
          eventKind: z.enum(["replacement", "rotation", "logout"]),
          session: sessionSchema.nullable(),
        })
        .strict()
    : undefined;
  let attempt = 0;
  let validation: { attempt: number; promise: Promise<void> } | undefined;
  const hasCurrentGeneration = () => {
    try {
      const envelope: unknown = JSON.parse(localStorage.getItem(storageKey) ?? "null");
      const parsed = persistedGenerationSchema.safeParse(envelope);
      return (
        parsed.success &&
        parsed.data.state.audience === audience &&
        parsed.data.state.generation === store.getState().generation
      );
    } catch {
      return false;
    }
  };
  const adoptStorage = () => {
    attempt += 1;
    clearIdentityCache();
    void store.persist?.rehydrate();
  };
  const synchronizeStorage = (event: StorageEvent) => {
    if (event.storageArea !== localStorage || (event.key !== storageKey && event.key !== null))
      return;
    adoptStorage();
  };
  const store = create<AudienceSessionState<User>>()(
    persist(
      (set, get): AudienceSessionState<User> => ({
        session: null,
        status: "anonymous",
        generation: crypto.randomUUID(),
        eventKind: "logout",
        setSession: (session) => {
          attempt += 1;
          clearIdentityCache();
          set({
            session,
            generation: crypto.randomUUID(),
            eventKind: "replacement",
            status:
              session.mustChangePassword || session.user.mustChangePassword
                ? "must_change_password"
                : "authenticated",
          });
        },
        updateTokens: (tokens) => {
          if (!hasCurrentGeneration()) {
            adoptStorage();
            return;
          }
          set((state) =>
            state.session
              ? {
                  session: { ...state.session, ...tokens },
                  eventKind: "rotation",
                  status: tokens.mustChangePassword ? "must_change_password" : state.status,
                }
              : state,
          );
        },
        clearSession: () => {
          if (get().session && !hasCurrentGeneration()) {
            adoptStorage();
            return;
          }
          attempt += 1;
          clearIdentityCache();
          set({
            session: null,
            status: "anonymous",
            generation: crypto.randomUUID(),
            eventKind: "logout",
          });
        },
        setStatus: (status) => {
          if (!hasCurrentGeneration()) adoptStorage();
          else set({ status });
        },
        setAuthenticating: () => {
          if (!hasCurrentGeneration()) adoptStorage();
          if (get().session) throw new Error("Audience session already exists");
          attempt += 1;
          set({ status: "authenticating" });
          return attempt;
        },
        isCurrentAttempt: (candidate) => candidate === attempt && hasCurrentGeneration(),
        isCurrentGeneration: (candidate) =>
          candidate === get().generation && hasCurrentGeneration(),
        authenticate: async (loadSession) => {
          const currentAttempt = get().setAuthenticating();
          try {
            const session = await loadSession();
            if (!get().isCurrentAttempt(currentAttempt))
              throw new Error("Stale authentication attempt");
            get().setSession(session);
            return session;
          } catch (error) {
            if (get().isCurrentAttempt(currentAttempt) && !get().session) get().clearSession();
            throw error;
          }
        },
        stopStorageSync: () => window.removeEventListener("storage", synchronizeStorage),
        revalidate: (loadUser, options = {}) => {
          if (!hasCurrentGeneration()) adoptStorage();
          if (!get().session) return Promise.resolve();
          if (options.joinExisting !== false && validation?.attempt === attempt)
            return validation.promise;
          const currentAttempt = attempt;
          if (get().status !== "authenticated" && get().status !== "must_change_password")
            set({ status: "hydrating" });
          const promise = loadUser()
            .then((user) => {
              const session = get().session;
              if (attempt !== currentAttempt || !session) return;
              if (!hasCurrentGeneration()) {
                adoptStorage();
                return;
              }
              set({
                session: { ...session, user, mustChangePassword: user.mustChangePassword },
                status: user.mustChangePassword ? "must_change_password" : "authenticated",
              });
            })
            .catch((error: unknown) => {
              if (attempt === currentAttempt && get().session) {
                if (!hasCurrentGeneration()) adoptStorage();
                else set({ status: "unavailable" });
              }
              throw error;
            })
            .finally(() => {
              if (validation?.attempt === currentAttempt) validation = undefined;
            });
          validation = { attempt: currentAttempt, promise };
          return promise;
        },
      }),
      {
        name: storageKey,
        storage: createJSONStorage(() => localStorage),
        version: 1,
        partialize: (state) => ({
          audience,
          session: state.session,
          generation: state.generation,
          eventKind: state.eventKind,
        }),
        merge: (persisted, current) => {
          const anonymous = { ...current, session: null, status: "anonymous" as const };
          if (!persistedSessionSchema) return anonymous;
          const parsed = persistedSessionSchema.safeParse(persisted);
          if (!parsed.success) return anonymous;
          return {
            ...current,
            session: parsed.data.session,
            generation: parsed.data.generation,
            eventKind: parsed.data.eventKind,
            status: parsed.data.session ? "hydrating" : "anonymous",
          };
        },
      },
    ),
  );
  if (typeof window !== "undefined") window.addEventListener("storage", synchronizeStorage);
  return store;
}
