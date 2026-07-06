import { usePreferencesStore } from "@/shared/config";
import { type SupportedLocale, supportedLocales } from "@/shared/i18n";
import { Button } from "@/shared/ui/button";

const localeLabel: Record<SupportedLocale, string> = {
  en: "EN",
  ar: "AR",
};

export function LocaleSwitcher() {
  const locale = usePreferencesStore((state) => state.locale);
  const setLocale = usePreferencesStore((state) => state.setLocale);

  function toggleLocale() {
    const currentIndex = supportedLocales.indexOf(locale);
    const nextIndex = (currentIndex + 1) % supportedLocales.length;
    setLocale(supportedLocales[nextIndex]);
  }

  return (
    <Button
      intent="toggle"
      size="iconSm"
      onClick={toggleLocale}
      aria-label={`Switch language (current: ${locale === "en" ? "English" : "العربية"})`}
    >
      <span className="text-xs font-semibold">{localeLabel[locale]}</span>
    </Button>
  );
}
