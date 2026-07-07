import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SupportedLocale } from "@/shared/i18n";

export type ThemeMode = "light" | "dark";

interface PreferencesState {
  locale: SupportedLocale;
  theme: ThemeMode;
  sidebarCollapsed: boolean;
  setLocale: (locale: SupportedLocale) => void;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      locale: "en",
      theme: "light",
      sidebarCollapsed: false,
      setLocale: (locale) => set({ locale }),
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((state) => ({ theme: state.theme === "light" ? "dark" : "light" })),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
    }),
    {
      name: "hrms-prefs",
    },
  ),
);
