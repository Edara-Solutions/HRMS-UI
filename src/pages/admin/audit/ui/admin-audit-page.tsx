import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { BookOpen, ChevronLeft, ChevronRight, Shield } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  AuditFilterBar,
  AuditFilterChoice,
  AuditFilterCombobox,
  AuditFilterTag,
  applyAuditFilterChange,
  auditChipClassName,
  auditFilterComboboxState,
  auditNamespace,
  clearedAuditFilters,
} from "@/features/audit-filters";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import {
  type PlatformAuditTrailParams,
  type PlatformAuditTrailScope,
  platformAuditEventTypes,
  usePlatformAuditTrail,
} from "../api/audit";
import { searchPlatformAuditActors } from "../api/audit-actors";
import { useAuditCompanyOptions } from "../api/audit-companies";
import { AdminAuditTable } from "./admin-audit-table";
import { AdminAuditTimeline } from "./admin-audit-timeline";

const scopes: readonly PlatformAuditTrailScope[] = ["PLATFORM", "COMPANY"];

interface EmptyStateProps {
  message: string;
  action?: ReactNode;
}

function EmptyState({ message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 py-16 text-center">
      <Shield size={32} className="text-[var(--color-text-faint)]" />
      <p className="text-sm font-medium text-[var(--color-text-muted)]">{message}</p>
      {action}
    </div>
  );
}

export function AdminAuditPage() {
  const { t } = useTranslation(auditNamespace);
  const search = useSearch({ from: "/admin/audit/" });
  const navigate = useNavigate({ from: "/admin/audit/" });
  const query = usePlatformAuditTrail(search);
  const companyOptions = useAuditCompanyOptions();

  const page = query.data;
  const items = page?.items ?? [];
  const hasMore = page?.hasMore ?? false;
  const nextCursor = page?.nextCursor ?? null;
  const view = search.view ?? "table";
  const selectedCompany = companyOptions.data?.find(
    (company) => company.value === search.companyPublicId,
  );

  /** Every filter change goes through here, which is what guarantees the cursor is dropped. */
  function changeFilters(change: Partial<PlatformAuditTrailParams>) {
    void navigate({ search: (previous) => applyAuditFilterChange(previous, change) });
  }

  function loadMore() {
    if (!nextCursor) return;
    void navigate({ search: (previous) => ({ ...previous, cursor: nextCursor }) });
  }

  function goBackToFirstPage() {
    void navigate({ search: ({ cursor: _cursor, ...rest }) => rest });
  }

  return (
    <div className="mx-auto max-w-[1480px]">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-[var(--color-text)]">
            {t("chrome.title")}
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            {t("chrome.platformSubtitle")}
          </p>
        </div>
        {/* The catalog answers "what is this event?" for a reader choosing filters, so it sits
            beside the trail rather than behind a menu. */}
        <Link
          to="/admin/audit/catalog"
          className={cn(
            auditChipClassName,
            "inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] transition-colors",
          )}
        >
          <BookOpen size={14} aria-hidden="true" />
          {t("chrome.catalogLink")}
        </Link>
      </div>

      <AuditFilterBar
        idPrefix="admin-audit"
        filters={search}
        eventTypes={platformAuditEventTypes}
        actorSearchKey="platform"
        searchActors={searchPlatformAuditActors}
        onChange={changeFilters}
        onClearAll={() =>
          changeFilters({
            ...clearedAuditFilters,
            companyPublicId: undefined,
            scope: undefined,
            traceId: undefined,
          })
        }
        slottedFilterCount={
          [search.companyPublicId, search.scope, search.traceId].filter(Boolean).length
        }
        companyFilter={
          <AuditFilterCombobox
            id="admin-audit-company"
            label={t("chrome.filterCompany")}
            searchPlaceholder={t("chrome.filterCompanySearch")}
            summary={selectedCompany?.label ?? search.companyPublicId}
            value={search.companyPublicId}
            options={companyOptions.data ?? []}
            state={auditFilterComboboxState(companyOptions)}
            onSelect={(option) => changeFilters({ companyPublicId: option.value })}
            onClear={() => changeFilters({ companyPublicId: undefined })}
          />
        }
        scopeFilter={
          <AuditFilterChoice
            id="admin-audit-scope"
            label={t("chrome.filterScope")}
            options={scopes.map((scope) => ({
              value: scope,
              label: scope === "PLATFORM" ? t("chrome.scopePlatform") : t("chrome.scopeCompany"),
            }))}
            value={search.scope}
            onChange={(scope) => changeFilters({ scope })}
          />
        }
        clickedFilter={
          search.traceId ? (
            <AuditFilterTag
              label={t("chrome.filterTrace")}
              value={search.traceId}
              mono
              onClear={() => changeFilters({ traceId: undefined })}
            />
          ) : undefined
        }
      />

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="flex flex-wrap items-center gap-3 border-b border-[var(--color-border)] px-4 py-2">
            <div className="flex items-center gap-1">
              {(["timeline", "table"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={view === mode}
                  onClick={() => changeFilters({ view: mode === "table" ? undefined : mode })}
                  className={cn(
                    "rounded-[var(--radius-sm)] px-2.5 py-1 text-[12px] font-medium transition-colors duration-150 ease-out",
                    view === mode
                      ? "bg-[var(--color-surface-2)] text-[var(--color-text)]"
                      : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]",
                  )}
                >
                  {t(mode === "table" ? "chrome.viewTable" : "chrome.viewTimeline")}
                </button>
              ))}
            </div>
            {view === "timeline" ? (
              <div
                role="group"
                aria-label={t("chrome.viewTimeline")}
                className="flex items-center gap-1 border-s border-[var(--color-border)] ps-3"
              >
                {(["chronological", "person", "entity"] as const).map((lensOption) => (
                  <button
                    key={lensOption}
                    type="button"
                    aria-pressed={(search.lens ?? "chronological") === lensOption}
                    onClick={() =>
                      changeFilters({
                        lens: lensOption === "chronological" ? undefined : lensOption,
                      })
                    }
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11.5px] font-medium transition-colors duration-150 ease-out",
                      (search.lens ?? "chronological") === lensOption
                        ? "bg-[var(--color-primary-soft)] text-[var(--color-primary)]"
                        : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]",
                    )}
                  >
                    {t(
                      lensOption === "person"
                        ? "chrome.lensPerson"
                        : lensOption === "entity"
                          ? "chrome.lensEntity"
                          : "chrome.viewTimeline",
                    )}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
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
          ) : view === "timeline" ? (
            <AdminAuditTimeline
              items={items}
              lens={search.lens ?? "chronological"}
              onTraceSelect={(traceId) => changeFilters({ traceId })}
            />
          ) : (
            <AdminAuditTable
              items={items}
              onActorSelect={(actorPublicId) => changeFilters({ actorPublicId })}
              onTraceSelect={(traceId) => changeFilters({ traceId })}
            />
          )}
        </CardContent>
        <div className="flex flex-col gap-3 border-t border-[var(--color-border)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs text-[var(--color-text-muted)]">
            {t("chrome.eventCount", { count: items.length })}
          </span>
          <div className="flex items-center gap-1">
            {search.cursor && (
              <Button
                variant="nav"
                size="iconXs"
                className="btn-nav-prev"
                onClick={goBackToFirstPage}
                aria-label={t("chrome.firstPage")}
                title={t("chrome.firstPage")}
              >
                <ChevronLeft size={14} />
              </Button>
            )}
            {hasMore && nextCursor ? (
              <Button
                variant="nav"
                size="iconXs"
                className="btn-nav-next"
                onClick={loadMore}
                aria-label={t("chrome.loadMore")}
                title={t("chrome.loadMore")}
              >
                <ChevronRight size={14} />
              </Button>
            ) : null}
          </div>
        </div>
      </Card>
    </div>
  );
}
