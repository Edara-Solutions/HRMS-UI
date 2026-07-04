import type { SupportedLocale } from "./config";

export type TextDirection = "ltr" | "rtl";

export function getDirection(locale: SupportedLocale): TextDirection {
  return locale === "ar" ? "rtl" : "ltr";
}

export function applyDocumentDirection(locale: SupportedLocale) {
  document.documentElement.lang = locale;
  document.documentElement.dir = getDirection(locale);
}
