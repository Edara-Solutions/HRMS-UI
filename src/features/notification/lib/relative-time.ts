import type { SupportedLocale } from "@/shared/i18n";

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const WEEK_MS = 7 * DAY_MS;

const formatters: Record<SupportedLocale, Intl.RelativeTimeFormat> = {
  en: new Intl.RelativeTimeFormat("en", { numeric: "auto", style: "narrow" }),
  ar: new Intl.RelativeTimeFormat("ar", { numeric: "auto", style: "narrow" }),
};

const dateFormatters: Record<SupportedLocale, Intl.DateTimeFormat> = {
  en: new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }),
  ar: new Intl.DateTimeFormat("ar-SA", { day: "numeric", month: "short" }),
};

/** Compact age for a feed row: relative up to a week, then a plain short date. */
export function formatRelativeTime(
  createdAt: string,
  locale: SupportedLocale,
  now: Date = new Date(),
): string {
  const created = new Date(createdAt);
  const elapsed = now.getTime() - created.getTime();

  if (elapsed >= WEEK_MS) return dateFormatters[locale].format(created);
  if (elapsed >= DAY_MS) return formatters[locale].format(-Math.floor(elapsed / DAY_MS), "day");
  if (elapsed >= HOUR_MS) return formatters[locale].format(-Math.floor(elapsed / HOUR_MS), "hour");
  return formatters[locale].format(-Math.floor(elapsed / MINUTE_MS), "minute");
}
