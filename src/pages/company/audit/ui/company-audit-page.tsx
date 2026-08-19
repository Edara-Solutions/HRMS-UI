import { useNavigate, useSearch } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Shield } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { auditNamespace } from "@/widgets/audit-detail";
import { useCompanyAuditTrail } from "../api/audit";
import { CompanyAuditTable } from "./company-audit-table";

function EmptyState({ message, action }: { message: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 py-16 text-center">
      <Shield size={32} className="text-[var(--color-text-faint)]" />
      <p className="text-sm font-medium text-[var(--color-text-muted)]">{message}</p>
      {action}
    </div>
  );
}

export function CompanyAuditPage() {
  const { t } = useTranslation(auditNamespace);
  const { cursor, limit } = useSearch({ from: "/company/audit/" });
  const navigate = useNavigate({ from: "/company/audit/" });
  const query = useCompanyAuditTrail({ cursor, limit });

  const page = query.data;
  const items = page?.items ?? [];
  const nextCursor = page?.nextCursor ?? null;
  const canGoOlder = (page?.hasMore ?? false) && nextCursor !== null;

  function goToOlderEvents() {
    if (!nextCursor) return;
    void navigate({ search: (previous) => ({ ...previous, cursor: nextCursor }) });
  }

  // The trail has no page numbers to count back through, so the only backward step the
  // opaque cursor supports is dropping it and returning to the newest page.
  function goToLatestEvents() {
    void navigate({
      search: ({ cursor: _cursor, ...rest }) => rest,
    });
  }

  return (
    <div className="mx-auto max-w-[1480px]">
      <div className="mb-6">
        <h1 className="text-[26px] font-bold tracking-tight text-[var(--color-text)]">
          {t("chrome.title")}
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">{t("chrome.companySubtitle")}</p>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {query.isPending ? (
            <EmptyState message={t("chrome.loading")} />
          ) : query.isError ? (
            <EmptyState
              message={t("chrome.loadFailed")}
              action={
                <Button intent="utility" size="sm" onClick={() => query.refetch()}>
                  {t("chrome.retry")}
                </Button>
              }
            />
          ) : items.length === 0 ? (
            <EmptyState message={t("chrome.empty")} />
          ) : (
            <CompanyAuditTable items={items} />
          )}
        </CardContent>
        {items.length > 0 && (
          <div className="flex items-center justify-between gap-3 border-t border-[var(--color-border)] px-4 py-3">
            <span className="text-xs text-[var(--color-text-muted)]">
              {t("chrome.eventCount", { count: items.length })}
            </span>
            <div className="flex items-center gap-1">
              {cursor && (
                <Button
                  variant="nav"
                  size="iconXs"
                  className="btn-nav-prev"
                  onClick={goToLatestEvents}
                  aria-label={t("chrome.latestEvents")}
                  title={t("chrome.latestEvents")}
                >
                  <ChevronLeft size={14} />
                </Button>
              )}
              {canGoOlder && (
                <Button
                  variant="nav"
                  size="iconXs"
                  className="btn-nav-next"
                  onClick={goToOlderEvents}
                  aria-label={t("chrome.olderEvents")}
                  title={t("chrome.olderEvents")}
                >
                  <ChevronRight size={14} />
                </Button>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
