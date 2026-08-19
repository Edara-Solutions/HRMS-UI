import { useNavigate, useSearch } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Shield } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  AuditFilterBar,
  AuditFilterChoice,
  AuditFilterCombobox,
  applyAuditFilterChange,
  clearedAuditFilters,
} from "@/features/audit-filters";
import { auditNamespace } from "@/shared/lib/audit-text";
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

const scopes: readonly PlatformAuditTrailScope[] = ["PLATFORM", "COMPANY"];

function TrailNotice({ message, action }: { message: string; action?: React.ReactNode }) {
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
      <div className="mb-6">
        <h1 className="text-[26px] font-bold tracking-tight text-[var(--color-text)]">
          {t("chrome.title")}
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          {t("chrome.platformSubtitle")}
        </p>
      </div>

      <AuditFilterBar
        idPrefix="admin-audit"
        filters={search}
        eventTypes={platformAuditEventTypes}
        actorSearchKey="platform"
        searchActors={searchPlatformAuditActors}
        onChange={changeFilters}
        onClearAll={() =>
          changeFilters({ ...clearedAuditFilters, companyPublicId: undefined, scope: undefined })
        }
        slottedFiltersActive={Boolean(search.companyPublicId || search.scope)}
        companyFilter={
          <AuditFilterCombobox
            id="admin-audit-company"
            label={t("chrome.filterCompany")}
            searchPlaceholder={t("chrome.filterCompanySearch")}
            summary={selectedCompany?.label ?? search.companyPublicId}
            value={search.companyPublicId}
            options={companyOptions.data ?? []}
            state={companyOptionsState()}
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
      />

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {query.isPending ? (
            <TrailNotice message={t("chrome.loading")} />
          ) : query.isError ? (
            <TrailNotice
              message={t("chrome.loadFailed")}
              action={
                <Button intent="utility" size="sm" onClick={() => query.refetch()}>
                  {t("chrome.retry")}
                </Button>
              }
            />
          ) : items.length === 0 ? (
            <TrailNotice message={t("chrome.empty")} />
          ) : (
            <AdminAuditTable
              items={items}
              onActorSelect={(actorPublicId) => changeFilters({ actorPublicId })}
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

  function companyOptionsState() {
    if (companyOptions.isPending) return "loading" as const;
    return companyOptions.isError ? ("error" as const) : ("ready" as const);
  }
}
