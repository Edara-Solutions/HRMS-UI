import { useNavigate, useSearch } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useDebouncedValue } from "@/shared/lib/use-debounced-value";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import type { LeadSort, LeadSource, LeadStatus } from "../api/leads";
import { useLeads } from "../api/leads";
import { CreateLeadModal } from "./create-lead-modal";
import { LeadListFilters, LeadListPagination } from "./lead-list-controls";
import { LeadsTableCardContent } from "./lead-table";

// --- Page -----------------------------------------------------------------

export function AdminLeadsPage() {
  const { page, pageSize, q, status, source, country, createdFrom, createdTo, isArchived, sort } =
    useSearch({
      from: "/admin/leads/",
    });
  const navigate = useNavigate({ from: "/admin/leads/" });
  const query = q ?? "";
  const statusFilter = status ?? "";
  const sourceFilter = source ?? "";
  const countryFilter = country ?? "";
  const [isCreatingLead, setIsCreatingLead] = useState(false);

  // Typed freely, then debounced into the URL/query below - avoids a request per keystroke
  // and avoids the URL's trim()-on-navigate snapping back a trailing space while typing.
  const [queryInput, setQueryInput] = useState(query);
  const [countryInput, setCountryInput] = useState(countryFilter);
  const debouncedQuery = useDebouncedValue(queryInput, 400);
  const debouncedCountry = useDebouncedValue(countryInput, 400);

  const setQuery = useCallback(
    (nextQuery: string) => {
      void navigate({
        search: (previous) => ({
          ...previous,
          q: nextQuery || undefined,
          page: 1,
        }),
      });
    },
    [navigate],
  );

  const setCountryFilter = useCallback(
    (nextCountry: string) => {
      void navigate({
        search: (previous) => ({
          ...previous,
          country: nextCountry || undefined,
          page: 1,
        }),
      });
    },
    [navigate],
  );

  useEffect(() => setQueryInput(query), [query]);
  useEffect(() => setCountryInput(countryFilter), [countryFilter]);
  // Only commit on the debounced value settling, not on every URL query state change.
  useEffect(() => {
    if (debouncedQuery !== query) setQuery(debouncedQuery);
  }, [debouncedQuery, query, setQuery]);
  // Only commit on the debounced value settling, not on every URL country state change.
  useEffect(() => {
    if (debouncedCountry !== countryFilter) setCountryFilter(debouncedCountry);
  }, [countryFilter, debouncedCountry, setCountryFilter]);

  const { data, isPending, isError } = useLeads({
    search: query || undefined,
    status: statusFilter || undefined,
    source: sourceFilter || undefined,
    country: countryFilter || undefined,
    createdFrom,
    createdTo,
    isArchived,
    sort,
    page,
    pageSize,
  });

  function setStatusFilter(nextStatus: LeadStatus | "") {
    void navigate({
      search: (previous) => ({
        ...previous,
        status: nextStatus || undefined,
        page: 1,
      }),
    });
  }

  function setSourceFilter(nextSource: LeadSource | "") {
    void navigate({
      search: (previous) => ({
        ...previous,
        source: nextSource || undefined,
        page: 1,
      }),
    });
  }

  function setCreatedDateFilter(field: "createdFrom" | "createdTo", value: string) {
    void navigate({
      search: (previous) => ({
        ...previous,
        [field]: value || undefined,
        page: 1,
      }),
    });
  }

  function setArchivedFilter(value: boolean) {
    void navigate({
      search: (previous) => ({ ...previous, isArchived: value, page: 1 }),
    });
  }
  function setSort(nextSort: LeadSort | undefined) {
    void navigate({
      search: (previous) => ({ ...previous, sort: nextSort, page: 1 }),
    });
  }

  function setPage(nextPage: number) {
    void navigate({ search: (previous) => ({ ...previous, page: nextPage }) });
  }

  function viewLead(publicId: string) {
    void navigate({ to: "/admin/leads/$publicId", params: { publicId } });
  }

  const visible = data?.items ?? [];
  const totalItems = data?.meta.totalItems ?? 0;
  const currentPage = data?.meta.page ?? page;
  const totalPages = Math.max(1, data?.meta.totalPages ?? 1);

  return (
    <div className="mx-auto max-w-[1480px]">
      {/* Page header */}
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-[var(--color-text)]">Leads</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            {totalItems} total leads - CRM sales pipeline
          </p>
        </div>
        <Button
          intent="cta"
          leadingIcon={<Plus size={15} />}
          className="w-full sm:w-auto"
          onClick={() => setIsCreatingLead(true)}
        >
          Add lead
        </Button>
      </div>

      <LeadListFilters
        archived={isArchived}
        country={countryFilter}
        createdFrom={createdFrom}
        createdTo={createdTo}
        onArchivedChange={setArchivedFilter}
        onCountryChange={setCountryInput}
        onCreatedDateChange={setCreatedDateFilter}
        onQueryChange={setQueryInput}
        onReset={() => {
          setQueryInput("");
          setStatusFilter("");
          setSourceFilter("");
          setCountryInput("");
          setArchivedFilter(false);
          setCreatedDateFilter("createdFrom", "");
          setCreatedDateFilter("createdTo", "");
          setSort(undefined);
        }}
        onSortChange={setSort}
        onSourceChange={setSourceFilter}
        onStatusChange={setStatusFilter}
        query={queryInput}
        sort={sort}
        source={sourceFilter}
        status={statusFilter}
      />
      {/* Table card */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <LeadsTableCardContent
            isError={isError}
            isPending={isPending}
            items={visible}
            onView={viewLead}
          />
        </CardContent>
        <LeadListPagination
          currentPage={currentPage}
          onPageChange={setPage}
          totalItems={totalItems}
          totalPages={totalPages}
          visibleItems={visible.length}
        />
      </Card>
      <CreateLeadModal
        open={isCreatingLead}
        onClose={() => setIsCreatingLead(false)}
        onViewLead={(publicId) => {
          setIsCreatingLead(false);
          viewLead(publicId);
        }}
      />
    </div>
  );
}
