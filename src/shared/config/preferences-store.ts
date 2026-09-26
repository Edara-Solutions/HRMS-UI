import { z } from "zod";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { SupportedLocale } from "@/shared/i18n";

export type ThemeMode = "light" | "dark";
export type NotificationListStyle = "panel" | "sheet" | "flat";
export type PreferenceScope = `${"company" | "platform"}:${string}`;
const presentationSchema = z
  .object({
    sidebarCollapsed: z.boolean(),
    notificationListStyle: z.enum(["panel", "sheet", "flat"]),
  })
  .strict();
const globalSchema = z.object({ locale: z.enum(["en", "ar"]), theme: z.enum(["light", "dark"]) });
const preferencesSchema = globalSchema
  .extend({
    scopes: z.record(z.string().regex(/^(company|platform):[0-9a-f-]{36}$/i), presentationSchema),
  })
  .strict();
export const defaultPresentation = {
  sidebarCollapsed: false,
  notificationListStyle: "panel",
} as const;
const defaults = { locale: "en", theme: "light", scopes: {} } as const;

interface PreferencesState {
  locale: SupportedLocale;
  theme: ThemeMode;
  scopes: Record<string, z.infer<typeof presentationSchema>>;
  setLocale: (locale: SupportedLocale) => void;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  setPresentation: (
    scope: PreferenceScope,
    patch: Partial<z.infer<typeof presentationSchema>>,
  ) => void;
}

/** Only global display choices are unambiguous in the old identity-less storage. */
export function migrateLegacyPreferences(raw: string | null) {
  try {
    const envelope = z.object({ state: globalSchema }).parse(JSON.parse(raw ?? "null"));
    return { ...envelope.state, scopes: {} };
  } catch {
    return defaults;
  }
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      ...defaults,
      setLocale: (locale) => set({ locale }),
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((state) => ({ theme: state.theme === "light" ? "dark" : "light" })),
      setPresentation: (scope, patch) =>
        set((state) => {
          const candidate = preferencesSchema.safeParse({
            locale: state.locale,
            theme: state.theme,
            scopes: {
              ...state.scopes,
              [scope]: { ...(state.scopes[scope] ?? defaultPresentation), ...patch },
            },
          });
          return candidate.success ? { scopes: candidate.data.scopes } : {};
        }),
    }),
    {
      name: "hrms-preferences:v2",
      version: 2,
      storage: createJSONStorage(() => ({
        getItem: (name) => {
          const current = localStorage.getItem(name);
          if (current !== null) {
            try {
              const envelope = z
                .object({ version: z.literal(2), state: preferencesSchema })
                .parse(JSON.parse(current));
              return JSON.stringify(envelope);
            } catch {
              return JSON.stringify({ version: 2, state: defaults });
            }
          }
          return JSON.stringify({
            version: 2,
            state: migrateLegacyPreferences(localStorage.getItem("hrms-prefs")),
          });
        },
        setItem: (name, value) => localStorage.setItem(name, value),
        removeItem: (name) => localStorage.removeItem(name),
      })),
      partialize: ({ locale, theme, scopes }) => ({ locale, theme, scopes }),
    },
  ),
);
