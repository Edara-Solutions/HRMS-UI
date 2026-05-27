import { type SupportedLocale, supportedLocales } from "@/i18n/config";
import { usePreferencesStore } from "@/preferences/store";

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
    <button
      type="button"
      onClick={toggleLocale}
      className="inline-flex size-[34px] items-center justify-center rounded-[var(--radius-md)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]"
      aria-label={`Switch language (current: ${locale === "en" ? "English" : "العربية"})`}
    >
      <span className="text-xs font-semibold">{localeLabel[locale]}</span>
    </button>
  );
}
