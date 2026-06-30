import type { SupportedLocale } from "@/i18n/config";

const longDateOptions: Intl.DateTimeFormatOptions = {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
};

/** One reusable long-date formatter per supported locale (BCP-47 tags). */
const longDateFormatters: Record<SupportedLocale, Intl.DateTimeFormat> = {
  en: new Intl.DateTimeFormat("en-GB", longDateOptions),
  ar: new Intl.DateTimeFormat("ar-SA", longDateOptions),
};

/**
 * Today's date as a long, human-readable string — e.g. "Friday, 22 May 2026"
 * (en) or its Arabic equivalent. Locale-aware so the dashboard header never
 * shows a stale, hardcoded date.
 */
export function formatTodayLong(locale: SupportedLocale, date: Date = new Date()): string {
  return longDateFormatters[locale].format(date);
}
