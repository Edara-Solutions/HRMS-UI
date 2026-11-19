import { useTranslation } from "react-i18next";
import type { LeadDetail } from "../api/crm";

const fields = ["companyName", "website", "industry", "country", "city"] as const;
export function LeadSummary({ lead }: { lead: LeadDetail["lead"] }) {
  const { t } = useTranslation("platform-leads");
  return (
    <>
      <dl className="grid min-w-0 gap-3 sm:grid-cols-3">
        {fields.map((field) => (
          <div key={field} className="min-w-0">
            <dt className="text-sm text-[var(--color-text-muted)]">{t(`field.${field}`)}</dt>
            <dd className="[overflow-wrap:anywhere]">{lead[field] ?? t("notProvided")}</dd>
          </div>
        ))}
      </dl>
      <p>
        {t(`enum.${lead.status}`)} · {t(`enum.${lead.source}`)} ·{" "}
        {t(`enum.${lead.companySizeRange}`)} · {t(lead.isArchived ? "archived" : "live")} ·{" "}
        {t(lead.isConverted ? "converted" : "unconverted")}
      </p>
    </>
  );
}
