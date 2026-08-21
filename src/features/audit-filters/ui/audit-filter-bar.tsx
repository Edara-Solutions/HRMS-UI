import { SlidersHorizontal } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/shared/ui/button";
import {
  type AuditActorMatch,
  type AuditOutcome,
  type AuditTrailFilters,
  auditOutcomes,
  countAuditFilters,
} from "../model/audit-filters";
import { auditNamespace } from "../model/audit-text";
import { AuditActorFilter } from "./audit-actor-filter";
import { AuditDateRangeFilter } from "./audit-date-range-filter";
import { AuditEventTypePicker } from "./audit-event-type-picker";
import { AuditFilterChoice } from "./audit-filter-choice";

interface AuditFilterBarProps {
  /** Prefixes every control's id, so both trails could render a bar on one page in tests. */
  idPrefix: string;
  filters: AuditTrailFilters;
  eventTypes: readonly string[];
  actorSearchKey: string;
  searchActors: (query: string) => Promise<AuditActorMatch[]>;
  onChange: (change: Partial<AuditTrailFilters>) => void;
  onClearAll: () => void;
  /** The Admin trail's Company starting point; the Company trail has one implicitly. */
  companyFilter?: ReactNode;
  /** The Admin trail's scope narrowing; every row a Company can see is COMPANY-scope. */
  scopeFilter?: ReactNode;
  /** A filter a reader arrived at by clicking a value in the trail, shown only while it is set. */
  clickedFilter?: ReactNode;
  /** How many slotted filters carry a value, so the count and "clear" speak for those too. */
  slottedFilterCount?: number;
}

const outcomeLabelKeys: Record<AuditOutcome, string> = {
  SUCCESS: "chrome.filterOutcomeSuccess",
  FAILURE: "chrome.filterOutcomeFailure",
};

/**
 * One row, read left to right: the starting points a person arrives with — a Company, a
 * time, a person — then a hairline, then the tools that narrow what is left. Every control
 * writes through `onChange`, which is what resets the cursor.
 */
export function AuditFilterBar({
  idPrefix,
  filters,
  eventTypes,
  actorSearchKey,
  searchActors,
  onChange,
  onClearAll,
  companyFilter,
  scopeFilter,
  clickedFilter,
  slottedFilterCount = 0,
}: AuditFilterBarProps) {
  const { t } = useTranslation(auditNamespace);
  const activeCount = countAuditFilters(filters) + slottedFilterCount;

  return (
    <div
      role="search"
      aria-label={t("chrome.filters")}
      className="mb-5 flex flex-wrap items-center gap-2"
    >
      <span className="inline-flex items-center gap-1.5 pe-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-faint)]">
        <SlidersHorizontal size={13} aria-hidden="true" />
        {t("chrome.filters")}
      </span>

      {companyFilter}
      <AuditDateRangeFilter
        id={`${idPrefix}-date-range`}
        occurredFrom={filters.occurredFrom}
        occurredTo={filters.occurredTo}
        onChange={onChange}
      />
      <AuditActorFilter
        id={`${idPrefix}-actor`}
        actorPublicId={filters.actorPublicId}
        searchKey={actorSearchKey}
        searchActors={searchActors}
        onChange={(actorPublicId) => onChange({ actorPublicId })}
      />

      {/* Starting points on one side, narrowing tools on the other — a hairline says so
          without spending a second row on it. */}
      <span aria-hidden="true" className="mx-1 hidden h-5 w-px bg-[var(--color-border)] sm:block" />

      <AuditEventTypePicker
        id={`${idPrefix}-event-type`}
        eventTypes={eventTypes}
        selected={filters.eventType ?? []}
        onChange={(eventType) => onChange({ eventType })}
      />
      <AuditFilterChoice
        id={`${idPrefix}-outcome`}
        label={t("chrome.filterOutcome")}
        options={auditOutcomes.map((outcome) => ({
          value: outcome,
          label: t(outcomeLabelKeys[outcome]),
        }))}
        value={filters.outcome}
        onChange={(outcome) => onChange({ outcome })}
      />
      {scopeFilter}
      {clickedFilter}

      {activeCount > 0 ? (
        <div className="flex items-center gap-2 ms-auto">
          <span className="text-[11px] tabular-nums text-[var(--color-text-muted)]">
            {t("chrome.filterActiveCount", { count: activeCount })}
          </span>
          <Button intent="utility" size="xs" onClick={onClearAll}>
            {t("chrome.filterClearAll")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
