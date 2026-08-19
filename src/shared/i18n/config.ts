import i18next from "i18next";
import HttpBackend from "i18next-http-backend";
import { initReactI18next } from "react-i18next";

export const supportedLocales = ["en", "ar"] as const;
export type SupportedLocale = (typeof supportedLocales)[number];

export const defaultLocale: SupportedLocale = "en";

void i18next
  .use(HttpBackend)
  .use(initReactI18next)
  .init({
    lng: defaultLocale,
    fallbackLng: defaultLocale,
    supportedLngs: supportedLocales,
    defaultNS: "common",
    ns: ["common", "auth", "audit"],
    // Audit labels are keyed by the event type itself, so a missing one renders as
    // `auth.session.started` rather than as nested lookup through its dots.
    keySeparator: false,
    interpolation: {
      escapeValue: false,
    },
    backend: {
      loadPath: "/locales/{{lng}}/{{ns}}.json",
    },
    saveMissing: import.meta.env.DEV,
    returnNull: false,
    // A namespace still in flight renders its keys instead of suspending, which is the
    // same honest fallback a missing label gets and needs no boundary to catch it.
    react: { useSuspense: false },
  });

export { i18next };
