import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/shared/ui/button";
import {
  type AuditActorMatch,
  type AuditOutcome,
  type AuditTrailFilters,
  auditOutcomes,
  hasAuditFilters,
} from "../model/audit-filters";
import { auditNamespace } from "../model/audit-text";
import { AuditActorFilter } from "./audit-actor-filter";
import { AuditDateRangeFilter } from "./audit-date-range-filter";
import { AuditEventTypePicker } from "./audit-event-type-picker";
import { AuditFilterChoice } from "./audit-filter-choice";

interface AuditFilterBarProps {
  /** Prefixes every control's id, so both trails can render the bar on one page in tests. */
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
  /** Whether a slotted filter is set, so "clear filters" appears for those too. */
  slottedFiltersActive?: boolean;
}

const outcomeLabelKeys: Record<AuditOutcome, string> = {
  SUCCESS: "chrome.filterOutcomeSuccess",
  FAILURE: "chrome.filterOutcomeFailure",
};

/**
 * The trail's starting points on the first row — Company, when, who — and the narrowing
 * tools on the second. Every control writes through `onChange`, which resets the cursor.
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
  slottedFiltersActive = false,
}: AuditFilterBarProps) {
  const { t } = useTranslation(auditNamespace);
  const anyFilterActive = hasAuditFilters(filters) || slottedFiltersActive;

  return (
    <div role="search" aria-label={t("chrome.filters")} className="mb-4 flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
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
      </div>

      <div className="flex flex-wrap items-center gap-2">
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
        {anyFilterActive ? (
          <Button intent="utility" size="xs" onClick={onClearAll}>
            {t("chrome.filterClearAll")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
