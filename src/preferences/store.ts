import type { SupportedLocale } from "@/i18n/config";
import { create } from "zustand";
import { persist } from "zustand/middleware";

type ThemeMode = "light";

interface PreferencesState {
  locale: SupportedLocale;
  theme: ThemeMode;
  sidebarCollapsed: boolean;
  setLocale: (locale: SupportedLocale) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      locale: "en",
      theme: "light",
      sidebarCollapsed: false,
      setLocale: (locale) => set({ locale }),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
    }),
    {
      name: "hrms-prefs",
    },
  ),
);
