import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { CountrySelect } from "@/shared/ui/country-select";
import { DatePicker } from "@/shared/ui/date-picker";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { ALL_SOURCES, ALL_STATUSES, getStatusBadge, SOURCE_LABEL } from "../api/lead-labels";
import type { LeadSort, LeadSource, LeadStatus } from "../api/leads";

const knownStatuses = new Set<string>(ALL_STATUSES);
const knownSources = new Set<string>(ALL_SOURCES);
const knownSorts = new Set<string>([
  "createdAtAsc",
  "createdAtDesc",
  "lastAttemptAtAsc",
  "lastAttemptAtDesc",
]);

function isLeadStatus(value: string): value is LeadStatus {
  return knownStatuses.has(value);
}

function isLeadSource(value: string): value is LeadSource {
  return knownSources.has(value);
}

function isLeadSort(value: string): value is LeadSort {
  return knownSorts.has(value);
}

interface LeadListFiltersProps {
  archived: boolean;
  country: string;
  createdFrom?: string;
  createdTo?: string;
  onArchivedChange: (value: boolean) => void;
  onCountryChange: (value: string) => void;
  onCreatedDateChange: (field: "createdFrom" | "createdTo", value: string) => void;
  onQueryChange: (value: string) => void;
  onReset: () => void;
  onSortChange: (value: LeadSort | undefined) => void;
  onSourceChange: (value: LeadSource | "") => void;
  onStatusChange: (value: LeadStatus | "") => void;
  query: string;
  sort: LeadSort | undefined;
  source: LeadSource | "";
  status: LeadStatus | "";
}

export function LeadListFilters({
  archived,
  country,
  createdFrom,
  createdTo,
  onArchivedChange,
  onCountryChange,
  onCreatedDateChange,
  onQueryChange,
  onReset,
  onSortChange,
  onSourceChange,
  onStatusChange,
  query,
  sort,
  source,
  status,
}: LeadListFiltersProps) {
  return (
    <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
      <div className="relative w-full lg:max-w-52">
        <Search
          size={14}
          className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
          aria-hidden="true"
        />
        <Input
          type="search"
          placeholder="Search by company"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          className="ps-8"
        />
      </div>

      <Select
        value={status}
        onValueChange={(value) => {
          if (value === "" || isLeadStatus(value)) onStatusChange(value);
        }}
      >
        <SelectTrigger className="lg:w-32" aria-label="Filter by status">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All statuses</SelectItem>
          {ALL_STATUSES.map((value) => (
            <SelectItem key={value} value={value}>
              {getStatusBadge(value).label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={source}
        onValueChange={(value) => {
          if (value === "" || isLeadSource(value)) onSourceChange(value);
        }}
      >
        <SelectTrigger className="lg:w-32" aria-label="Filter by source">
          <SelectValue placeholder="All sources" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All sources</SelectItem>
          {ALL_SOURCES.map((value) => (
            <SelectItem key={value} value={value}>
              {SOURCE_LABEL[value]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <CountrySelect
        value={country}
        onValueChange={onCountryChange}
        id="admin-leads-country"
        className="lg:w-32"
      />
      
      <div className="lg:w-32">
        <DatePicker
        id="admin-leads-created-from"
        value={createdFrom}
        onChange={(value) => onCreatedDateChange("createdFrom", value ?? "")}
        placeholder="Date From"
        />
      </div>

      <div className="lg:w-32">
        <DatePicker
          id="admin-leads-created-to"
          value={createdTo}
          onChange={(value) => onCreatedDateChange("createdTo", value ?? "")}
          placeholder="Date To"
        />
      </div>

      <Select
        value={String(archived)}
        onValueChange={(value) => onArchivedChange(value === "true")}
      >
        <SelectTrigger className="lg:w-32" aria-label="Filter by archive state">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="false">Active</SelectItem>
          <SelectItem value="true">Archived</SelectItem>
        </SelectContent>
      </Select>

      <Button variant="ghost" size="sm" onClick={onReset}>
        Reset
      </Button>

      <Select
        value={sort ?? "createdAtDesc"}
        onValueChange={(value) => {
          if (isLeadSort(value)) onSortChange(value === "createdAtDesc" ? undefined : value);
        }}
      >
        <SelectTrigger className="lg:ms-auto lg:w-32" aria-label="Sort leads">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="createdAtDesc">Newest created</SelectItem>
          <SelectItem value="createdAtAsc">Oldest created</SelectItem>
          <SelectItem value="lastAttemptAtDesc">Latest attempt</SelectItem>
          <SelectItem value="lastAttemptAtAsc">Oldest attempt</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

interface LeadListPaginationProps {
  currentPage: number;
  onPageChange: (page: number) => void;
  totalItems: number;
  totalPages: number;
  visibleItems: number;
}

export function LeadListPagination({
  currentPage,
  onPageChange,
  totalItems,
  totalPages,
  visibleItems,
}: LeadListPaginationProps) {
  return (
    <div className="flex flex-col gap-3 border-t border-[var(--color-border)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-xs text-[var(--color-text-muted)]">
        {visibleItems} of {totalItems} leads
      </span>
      <div className="flex items-center gap-1">
        <Button
          variant="nav"
          size="iconXs"
          className="btn-nav-prev"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          aria-label="Previous page"
          title="Previous page"
        >
          <ChevronLeft size={14} />
        </Button>
        <span className="select-none px-2 text-[12px] tabular-nums text-[var(--color-text-muted)]">
          {currentPage} / {totalPages}
        </span>
        <Button
          variant="nav"
          size="iconXs"
          className="btn-nav-next"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          aria-label="Next page"
          title="Next page"
        >
          <ChevronRight size={14} />
        </Button>
      </div>
    </div>
  );
}
