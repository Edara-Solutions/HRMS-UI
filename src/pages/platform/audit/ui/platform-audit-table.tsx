import { useState } from "react";
import { useTranslation } from "react-i18next";
import { auditNamespace } from "@/features/audit-filters";
import { usePreferencesStore } from "@/shared/config";
import { cn } from "@/shared/lib/cn";
import { TruncatedText } from "@/shared/ui/truncated-text";
import {
  type AuditDensity,
  AuditDensityControl,
  AuditEventRow,
  keyAuditRecords,
  UnavailableAuditEventRow,
  useAuditRowExpansion,
} from "@/widgets/audit-detail";
import type { PlatformAuditTrailItem } from "../api/audit";
import { PlatformAuditEventInsight } from "./platform-audit-event-insight";

function companyCell(value: string | null, platformLabel: string) {
  return (
    <td className="px-4 py-3">
      <TruncatedText
        text={value ?? platformLabel}
        className="max-w-44 font-mono text-[11px] text-[var(--color-text-muted)]"
      />
    </td>
  );
}

const emptyCompanyCell = <td className="px-4 py-3 text-[var(--color-text-faint)]">–</td>;

interface PlatformAuditTableProps {
  items: PlatformAuditTrailItem[];
  onActorSelect: (actorPublicId: string) => void;
  onTraceSelect: (traceId: string) => void;
}

export function PlatformAuditTable({
  items,
  onActorSelect,
  onTraceSelect,
}: PlatformAuditTableProps) {
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
              const detailId = `platform-audit-detail-${rowKey.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
              const toggle = () => expansion.toggle(rowKey);
              if (!("recordedAt" in event))
                return (
                  <UnavailableAuditEventRow
                    key={rowKey}
                    occurredAt={event.occurredAt}
                    locale={locale}
                    companyCell={emptyCompanyCell}
                  />
                );
              const e = event;

              return (
                <AuditEventRow
                  key={rowKey}
                  event={e}
                  portal="platform"
                  density={density}
                  expanded={expanded}
                  detailId={detailId}
                  columnCount={5}
                  locale={locale}
                  onActorSelect={onActorSelect}
                  onTraceSelect={onTraceSelect}
                  insight={
                    <PlatformAuditEventInsight
                      eventType={e.eventType}
                      occurredAt={e.occurredAt}
                      recordingBinding={e.recordingBinding}
                      recordedAt={e.recordedAt}
                      locale={locale}
                    />
                  }
                  subjectFallback={e.companyPublicId ?? t("chrome.platform")}
                  companyCell={companyCell(e.companyPublicId, t("chrome.platform"))}
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
