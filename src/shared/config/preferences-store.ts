import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SupportedLocale } from "@/shared/i18n";

export type ThemeMode = "light" | "dark";

/** Which shape the notification center opens in: anchored panel, end-side sheet, compact list. */
export type NotificationListStyle = "panel" | "sheet" | "flat";

interface PreferencesState {
  locale: SupportedLocale;
  theme: ThemeMode;
  sidebarCollapsed: boolean;
  notificationListStyle: NotificationListStyle;
  setLocale: (locale: SupportedLocale) => void;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setNotificationListStyle: (style: NotificationListStyle) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      locale: "en",
      theme: "light",
      sidebarCollapsed: false,
      notificationListStyle: "panel",
      setLocale: (locale) => set({ locale }),
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((state) => ({ theme: state.theme === "light" ? "dark" : "light" })),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      setNotificationListStyle: (notificationListStyle) => set({ notificationListStyle }),
    }),
    {
      name: "hrms-prefs",
    },
  ),
);
