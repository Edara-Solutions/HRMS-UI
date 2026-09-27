import { Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { RefusalMode } from "@/shared/api";
import { usePreferencesStore } from "@/shared/config";
import { formatInstant } from "@/shared/lib/format-instant";

interface CompanyAccessNoticeProps {
  mode: RefusalMode;
  reason: string | null;
  effectiveUntil: string | null;
}

/** The restricted-mode banner. `NORMAL` renders nothing; the reason is the customer-safe field. */
export function CompanyAccessNotice({ mode, reason, effectiveUntil }: CompanyAccessNoticeProps) {
  const { t } = useTranslation("organization");
  const locale = usePreferencesStore((state) => state.locale);
  if (mode === "NORMAL") return null;
  return (
    <section
      aria-labelledby="company-access-notice"
      className="flex items-start gap-3 rounded-[var(--radius-md)] border border-[color-mix(in_srgb,var(--color-warning)_35%,var(--color-border))] bg-[var(--color-warning-soft)] px-4 py-3 text-sm"
    >
      <Info aria-hidden="true" size={16} className="mt-0.5 shrink-0 text-[var(--color-warning)]" />
      <div className="min-w-0 space-y-1">
        <h2 id="company-access-notice" className="font-semibold text-[var(--color-text)]">
          {t(`access.${mode}.title`)}
        </h2>
        <p className="text-[var(--color-text-muted)]">{t(`access.${mode}.description`)}</p>
        {reason && <p className="break-words text-[var(--color-text)]">{reason}</p>}
        {effectiveUntil && (
          <p className="text-[var(--color-text-muted)]">
            {t("access.until", { date: formatInstant(effectiveUntil, locale) })}
          </p>
        )}
      </div>
    </section>
  );
}
