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
    ns: ["common", "auth", "notification"],
    interpolation: {
      escapeValue: false,
    },
    backend: {
      loadPath: "/locales/{{lng}}/{{ns}}.json",
    },
    saveMissing: import.meta.env.DEV,
    returnNull: false,
    // No Suspense boundary wraps the app shell, so a namespace that is still loading must
    // fall through to the key rather than suspend the header out of the page.
    react: { useSuspense: false },
  });

export { i18next };
