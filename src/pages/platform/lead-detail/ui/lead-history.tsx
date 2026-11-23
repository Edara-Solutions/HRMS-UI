import { useTranslation } from "react-i18next";
import { usePreferencesStore } from "@/shared/config";
import { formatFullInstant, formatInstant } from "@/shared/lib/format-instant";
import type { LeadDetail } from "../api/crm";
export function LeadHistory({ lead }: { lead: LeadDetail["lead"] }) {
  const { t } = useTranslation("platform-leads");
  const locale = usePreferencesStore((state) => state.locale);
  const dates = [
    ["history.lastAttemptAt", lead.lastAttemptAt],
    ["history.createdAt", lead.createdAt],
    ["history.updatedAt", lead.updatedAt],
  ] as const;
  return (
    <dl className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,10rem),1fr))] gap-x-5 gap-y-4 text-sm [&_dt]:text-[var(--color-text-muted)]">
      <div>
        <dt>{t("leads.attemptsColumn")}</dt>
        <dd className="tabular-nums">
          {new Intl.NumberFormat(locale).format(lead.numberOfAttempts)}
        </dd>
      </div>
      {dates.map(([label, value]) => (
        <div key={label}>
          <dt>{t(label)}</dt>
          <dd>
            <time dateTime={value} title={formatFullInstant(value, locale)}>
              {formatInstant(value, locale)}
            </time>
          </dd>
        </div>
      ))}
      {lead.lostReason && (
        <div>
          <dt>{t("field.lostReason")}</dt>
          <dd>{t(`enum.${lead.lostReason}`)}</dd>
        </div>
      )}
    </dl>
  );
}
