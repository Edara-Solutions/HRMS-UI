import { useTranslation } from "react-i18next";
import { Badge } from "@/shared/ui/badge";
import type { LeadDetail } from "../api/crm";

const fields = ["website", "industry", "country", "city"] as const;
function websiteUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

export function LeadSummary({ lead }: { lead: LeadDetail["lead"] }) {
  const { t } = useTranslation("platform-leads");
  const website = lead.website && websiteUrl(lead.website);
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          variant={lead.isConverted ? "success" : lead.status === "LOST" ? "warning" : "primary"}
        >
          {t(`enum.${lead.status}`)}
        </Badge>
        {lead.isArchived && <Badge variant="warning">{t("archived")}</Badge>}
      </div>
      <dl className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,10rem),1fr))] gap-x-5 gap-y-4 border-t border-[var(--color-border)] pt-4">
        {fields.map((field) => (
          <div key={field} className="min-w-0">
            <dt className="text-sm text-[var(--color-text-muted)]">{t(`field.${field}`)}</dt>
            <dd dir="auto" className="text-sm [overflow-wrap:anywhere]">
              {field === "website" && website ? (
                <a
                  href={website}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[var(--color-primary)] underline underline-offset-2"
                >
                  {lead.website}
                </a>
              ) : (
                lead[field]?.trim() || t("notProvided")
              )}
            </dd>
          </div>
        ))}
        <div>
          <dt className="text-sm text-[var(--color-text-muted)]">{t("field.source")}</dt>
          <dd className="text-sm">{t(`enum.${lead.source}`)}</dd>
        </div>
        <div>
          <dt className="text-sm text-[var(--color-text-muted)]">{t("field.companySizeRange")}</dt>
          <dd className="text-sm">{t(`enum.${lead.companySizeRange}`)}</dd>
        </div>
      </dl>
    </>
  );
}
