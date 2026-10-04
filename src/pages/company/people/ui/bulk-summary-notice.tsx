import { useTranslation } from "react-i18next";
import { Button } from "@/shared/ui/button";
import type { BulkSummary } from "../model/roster";

interface BulkSummaryNoticeProps {
  action: "create" | "status" | "delete";
  summary: BulkSummary;
  /** Display label for each submitted position, in submission order. */
  labels: readonly string[];
  onDismiss: () => void;
}

/** Per-item bulk outcome: succeeded, declared failures by name, and anything the response left unknown. */
export function BulkSummaryNotice({ action, summary, labels, onDismiss }: BulkSummaryNoticeProps) {
  const { t } = useTranslation("people");
  const partial = summary.failedPositions.length > 0 || summary.unaccounted > 0;
  return (
    <section
      role={partial ? "alert" : "status"}
      aria-labelledby="bulk-summary-title"
      className="space-y-2 rounded-[var(--radius-lg)] border border-[var(--color-border)] p-4 text-sm"
    >
      <h2 id="bulk-summary-title" className="font-semibold">
        {t(`bulk.result.${action}`, { count: summary.succeeded })}
      </h2>
      {summary.failedPositions.length > 0 && (
        <div className="space-y-1">
          <p>{t("bulk.result.failed", { count: summary.failedPositions.length })}</p>
          <ul className="list-disc space-y-0.5 ps-5 text-[var(--color-text-muted)]">
            {summary.failedPositions.map((position) => (
              <li key={position}>{labels[position - 1] ?? t("bulk.result.row", { position })}</li>
            ))}
          </ul>
        </div>
      )}
      {summary.unaccounted > 0 && (
        <p className="text-[var(--color-text-muted)]">
          {t("bulk.result.unknown", { count: summary.unaccounted })}
        </p>
      )}
      <Button intent="utility" onClick={onDismiss}>
        {t("bulk.result.dismiss")}
      </Button>
    </section>
  );
}
