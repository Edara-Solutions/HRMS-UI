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
import type { PlatformAuditTrailItem } from "../api/audit";

function isUnrecognized(
  event: PlatformAuditTrailItem,
): event is Extract<PlatformAuditTrailItem, { eventType: "__unrecognized__" }> {
  return event.eventType === "__unrecognized__";
}

function isUnavailable(
  event: PlatformAuditTrailItem,
): event is Extract<PlatformAuditTrailItem, { eventType: "audit.event.unavailable" }> {
  return event.eventType === "audit.event.unavailable";
}

function companyCell(value: string | null, platformLabel: string) {
  return (
    <td className="px-4 py-3">
      <p className="max-w-44 truncate font-mono text-[11px] text-[var(--color-text-muted)]">
        {value ?? platformLabel}
      </p>
    </td>
  );
}

const emptyCompanyCell = <td className="px-4 py-3 text-[var(--color-text-faint)]">–</td>;

interface AdminAuditTableProps {
  items: PlatformAuditTrailItem[];
}

export function AdminAuditTable({ items }: AdminAuditTableProps) {
  const { t } = useTranslation(auditNamespace);
  const locale = usePreferencesStore((state) => state.locale);
  const [density, setDensity] = useState<AuditDensity>("comfortable");
  const expansion = useAuditRowExpansion();

  return (
    <div>
      <AuditDensityControl density={density} onChange={setDensity} />
      <div className="scrollbar-calm overflow-x-auto">
        <table className="w-full min-w-[920px]">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)]">
              {[
                [t("chrome.columnEvent"), "w-[28%]"],
                [t("chrome.columnActor"), "w-[20%]"],
                [t("chrome.columnSubject"), "w-[18%]"],
                [t("chrome.columnCompany"), "w-[18%]"],
                [t("chrome.columnWhen"), "w-[16%]"],
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
              const detailId = `admin-audit-detail-${rowKey.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
              const toggle = () => expansion.toggle(rowKey);

              if (isUnrecognized(event)) {
                return (
                  <DegradedAuditEventRow
                    key={rowKey}
                    raw={event.raw}
                    expanded={expanded}
                    detailId={detailId}
                    columnCount={5}
                    locale={locale}
                    companyCell={emptyCompanyCell}
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
                    companyCell={emptyCompanyCell}
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
                  columnCount={5}
                  locale={locale}
                  subjectFallback={event.companyPublicId ?? t("chrome.platform")}
                  companyCell={companyCell(event.companyPublicId, t("chrome.platform"))}
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
