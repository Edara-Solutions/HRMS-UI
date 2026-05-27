import { type SupportedLocale, supportedLocales } from "@/i18n/config";
import { usePreferencesStore } from "@/preferences/store";
import { cn } from "@/shared/lib/cn";
import { Languages } from "lucide-react";

const localeLabel: Record<SupportedLocale, string> = {
  en: "English",
  ar: "العربية",
};

export function LocaleSwitcher() {
  const locale = usePreferencesStore((state) => state.locale);
  const setLocale = usePreferencesStore((state) => state.setLocale);

  return (
    <fieldset className="inline-flex min-h-11 items-center gap-1 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-1">
      <legend className="sr-only">Locale</legend>
      <Languages aria-hidden="true" className="ms-2 text-[var(--color-text-muted)]" size={16} />
      {supportedLocales.map((item) => (
        <button
          aria-pressed={locale === item}
          className={cn(
            "rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium text-[var(--color-text-muted)] transition-colors",
            locale === item && "bg-[var(--color-primary-soft)] text-[var(--color-primary)]",
          )}
          key={item}
          onClick={() => setLocale(item)}
          type="button"
        >
          {localeLabel[item]}
        </button>
      ))}
    </fieldset>
  );
}
