import type { SupportedLocale } from "@/shared/i18n";

interface FormatInstantOptions {
  now?: Date;
}

const localeTags: Record<SupportedLocale, string> = {
  en: "en-GB",
  ar: "ar-SA-u-ca-gregory",
};

const relativeLabels: Record<
  SupportedLocale,
  { today: string; yesterday: string; justNow: string; unknownTime: string }
> = {
  en: { today: "Today", yesterday: "Yesterday", justNow: "just now", unknownTime: "Unknown time" },
  ar: { today: "اليوم", yesterday: "أمس", justNow: "الآن", unknownTime: "وقت غير معروف" },
};

function isSameDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function isYesterday(date: Date, now: Date): boolean {
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  return isSameDay(date, yesterday);
}

function formatClock(date: Date, locale: SupportedLocale, includeSeconds: boolean): string {
  const value = new Intl.DateTimeFormat(localeTags[locale], {
    hour: "numeric",
    minute: "2-digit",
    second: includeSeconds ? "2-digit" : undefined,
    hour12: true,
  }).format(date);

  return value.replace(/\b(AM|PM)\b/g, (period) => period.toLowerCase());
}

function formatCalendarDate(date: Date, locale: SupportedLocale, includeYear: boolean): string {
  return new Intl.DateTimeFormat(localeTags[locale], {
    day: "numeric",
    month: "short",
    year: includeYear ? "numeric" : undefined,
  }).format(date);
}

function parseInstant(value: string): Date | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatInstant(
  value: string,
  locale: SupportedLocale,
  options: FormatInstantOptions = {},
): string {
  const date = parseInstant(value);
  if (!date) return relativeLabels[locale].unknownTime;

  const now = options.now ?? new Date();
  if (Math.abs(now.getTime() - date.getTime()) < 60_000) return relativeLabels[locale].justNow;

  const clock = formatClock(date, locale, false);
  if (isSameDay(date, now)) return `${relativeLabels[locale].today}, ${clock}`;
  if (isYesterday(date, now)) return `${relativeLabels[locale].yesterday}, ${clock}`;

  const calendarDate = formatCalendarDate(date, locale, date.getFullYear() !== now.getFullYear());
  return `${calendarDate}, ${clock}`;
}

export function formatFullInstant(value: string, locale: SupportedLocale): string {
  const date = parseInstant(value);
  if (!date) return relativeLabels[locale].unknownTime;

  const datePart = formatCalendarDate(date, locale, true);
  const timePart = new Intl.DateTimeFormat(localeTags[locale], {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZoneName: "long",
  })
    .format(date)
    .replace(/\b(AM|PM)\b/g, (period) => period.toLowerCase());

  return `${datePart}, ${timePart}`;
}
