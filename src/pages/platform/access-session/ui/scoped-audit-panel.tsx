import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { auditNamespace } from "@/features/audit-filters";
import { delegatedCompanyOperations as operations } from "@/shared/api";
import { usePreferencesStore } from "@/shared/config";
import { Button } from "@/shared/ui/button";
import { QueryPanel } from "@/shared/ui/query-panel";
import {
  AuditEventRow,
  keyAuditRecords,
  UnavailableAuditEventRow,
  useAuditRowExpansion,
} from "@/widgets/audit-detail";
import { auditPageSize, type DelegatedAuditItem } from "../api/access-session";
import type { AccessSessionWorkspace } from "../model/use-access-session-workspace";

function isUnavailable(
  event: DelegatedAuditItem,
): event is Extract<DelegatedAuditItem, { eventType: "audit.event.unavailable" }> {
  return event.eventType === "audit.event.unavailable";
}

export function ScopedAuditPanel({ workspace }: { workspace: AccessSessionWorkspace }) {
  const { t } = useTranslation("platform-access-session");
  const { t: tAudit } = useTranslation(auditNamespace);
  const locale = usePreferencesStore((state) => state.locale);
  const expansion = useAuditRowExpansion();
  const [cursors, setCursors] = useState<readonly string[]>([]);
  const cursor = cursors.at(-1);
  const readable = workspace.availability(operations.auditTrail).state === "enabled";
  const { data, error, isPending, isFetching, refetch } = useQuery({
    ...workspace.delegated.auditTrail({ limit: auditPageSize, cursor }),
    enabled: readable,
    placeholderData: keepPreviousData,
  });

  if (!readable) return <p className="text-sm">{t("area.notGranted")}</p>;
  const nextCursor = data?.hasMore ? data.nextCursor : null;

  return (
    <QueryPanel
      title={t("audit.title")}
      pending={isPending}
      error={error}
      retry={() => void refetch()}
    >
      <p className="text-sm text-[var(--color-text-muted)]">{t("audit.scope")}</p>
      {data && data.items.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)]">{t("audit.empty")}</p>
      ) : (
        data && (
          <div className="scrollbar-calm overflow-x-auto" aria-busy={isFetching}>
            <table className="w-full min-w-[720px]">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)]">
                  {[
                    tAudit("chrome.columnEvent"),
                    tAudit("chrome.columnActor"),
                    tAudit("chrome.columnSubject"),
                    tAudit("chrome.columnWhen"),
                  ].map((header) => (
                    <th
                      key={header}
                      scope="col"
                      className="px-4 py-2.5 text-start text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {keyAuditRecords(data.items).map(({ event, rowKey }) =>
                  isUnavailable(event) ? (
                    <UnavailableAuditEventRow
                      key={rowKey}
                      occurredAt={event.occurredAt}
                      locale={locale}
                    />
                  ) : (
                    <AuditEventRow
                      key={rowKey}
                      event={event}
                      portal="company"
                      density="comfortable"
                      expanded={expansion.isExpanded(rowKey)}
                      detailId={`delegated-audit-${rowKey.replace(/[^a-zA-Z0-9_-]/g, "-")}`}
                      columnCount={4}
                      locale={locale}
                      subjectFallback={tAudit("chrome.company")}
                      onToggle={() => expansion.toggle(rowKey)}
                    />
                  ),
                )}
              </tbody>
            </table>
          </div>
        )
      )}
      {(cursors.length > 0 || nextCursor) && (
        <nav className="flex items-center justify-between gap-3" aria-label={t("pagination")}>
          <Button
            intent="action"
            disabled={cursors.length === 0 || isFetching}
            onClick={() => setCursors((stack) => stack.slice(0, -1))}
          >
            {t("audit.newer")}
          </Button>
          <Button
            intent="action"
            disabled={!nextCursor || isFetching}
            onClick={() => nextCursor && setCursors((stack) => [...stack, nextCursor])}
          >
            {t("audit.older")}
          </Button>
        </nav>
      )}
    </QueryPanel>
  );
}
