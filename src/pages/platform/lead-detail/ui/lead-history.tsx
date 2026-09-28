import { useTranslation } from "react-i18next";
import { usePreferencesStore } from "@/shared/config";
import { formatInstant } from "@/shared/lib/format-instant";
import type { LeadDetail } from "../api/crm";
export function LeadHistory({ lead }: { lead: LeadDetail["lead"] }) {
  const { t } = useTranslation("platform-leads");
  const locale = usePreferencesStore((state) => state.locale);
  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      <div>
        <dt>{t("attempts", { count: lead.numberOfAttempts })}</dt>
        <dd>{formatInstant(lead.lastAttemptAt, locale)}</dd>
      </div>
      <div>
        <dt>{t("field.lostReason")}</dt>
        <dd>{lead.lostReason ? t(`enum.${lead.lostReason}`) : t("notProvided")}</dd>
      </div>
      <div>
        <dt>{t("history.createdAt")}</dt>
        <dd>{formatInstant(lead.createdAt, locale)}</dd>
      </div>
      <div>
        <dt>{t("history.updatedAt")}</dt>
        <dd>{formatInstant(lead.updatedAt, locale)}</dd>
      </div>
    </dl>
  );
}
