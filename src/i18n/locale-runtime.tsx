import { usePreferencesStore } from "@/preferences/store";
import { useEffect } from "react";
import { i18next } from "./config";
import { applyDocumentDirection } from "./direction";

export function LocaleRuntime() {
  const locale = usePreferencesStore((state) => state.locale);

  useEffect(() => {
    applyDocumentDirection(locale);
    void i18next.changeLanguage(locale);
  }, [locale]);

  return null;
}
