import { useState } from "react";
import { useTranslation } from "react-i18next";
import { usePreferencesStore } from "@/shared/config";
import { cn } from "@/shared/lib/cn";
import {
  type AuditDensity,
  AuditDensityControl,
  AuditEventRow,
  auditNamespace,
  DegradedAuditEventRow,
  keyAuditRecords,
  UnavailableAuditEventRow,
  useAuditRowExpansion,
} from "@/widgets/audit-detail";
import type { CompanyAuditTrailItem } from "../api/audit";

function isUnrecognized(
  event: CompanyAuditTrailItem,
): event is Extract<CompanyAuditTrailItem, { eventType: "__unrecognized__" }> {
  return event.eventType === "__unrecognized__";
}

function isUnavailable(
  event: CompanyAuditTrailItem,
): event is Extract<CompanyAuditTrailItem, { eventType: "audit.event.unavailable" }> {
  return event.eventType === "audit.event.unavailable";
}

interface CompanyAuditTableProps {
  items: CompanyAuditTrailItem[];
}

export function CompanyAuditTable({ items }: CompanyAuditTableProps) {
  const { t } = useTranslation(auditNamespace);
  const locale = usePreferencesStore((state) => state.locale);
  const [density, setDensity] = useState<AuditDensity>("comfortable");
  const expansion = useAuditRowExpansion();

  return (
    <div>
      <AuditDensityControl density={density} onChange={setDensity} />
      <div className="scrollbar-calm overflow-x-auto">
        <table className="w-full min-w-[720px]">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)]">
              {[
                [t("chrome.columnEvent"), "w-[34%]"],
                [t("chrome.columnActor"), "w-[24%]"],
                [t("chrome.columnSubject"), "w-[24%]"],
                [t("chrome.columnWhen"), "w-[18%]"],
              ].map(([header, width]) => (
                <th
                  key={header}
                  className={cn(
                    "px-4 py-2.5 text-start text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]",
                    width,
                  )}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {keyAuditRecords(items).map(({ event, rowKey }) => {
              const expanded = expansion.isExpanded(rowKey);
              const detailId = `company-audit-detail-${rowKey.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
              const toggle = () => expansion.toggle(rowKey);

              if (isUnrecognized(event)) {
                return (
                  <DegradedAuditEventRow
                    key={rowKey}
                    raw={event.raw}
                    expanded={expanded}
                    detailId={detailId}
                    columnCount={4}
                    locale={locale}
                    onToggle={toggle}
                  />
                );
              }
              if (isUnavailable(event)) {
                return (
                  <UnavailableAuditEventRow
                    key={rowKey}
                    occurredAt={event.occurredAt}
                    locale={locale}
                  />
                );
              }
              return (
                <AuditEventRow
                  key={rowKey}
                  event={event}
                  density={density}
                  expanded={expanded}
                  detailId={detailId}
                  columnCount={4}
                  locale={locale}
                  subjectFallback={t("chrome.company")}
                  onToggle={toggle}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
