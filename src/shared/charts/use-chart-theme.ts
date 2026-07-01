import { usePreferencesStore } from "@/preferences/store";

/**
 * ApexCharts accepts only `"light" | "dark"` for `tooltip.theme`.
 * Returns the active theme from the preferences store so chart tooltips
 * stay in sync with the global `data-theme` toggle (which lives on <html>
 * via LocaleRuntime), instead of being hardcoded to light.
 */
export function useChartTheme() {
  return usePreferencesStore((state) => state.theme);
}
