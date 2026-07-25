import { useNavigate, useSearch } from "@tanstack/react-router";
import { ExternalLink, Plus, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useDebouncedValue } from "@/shared/lib/use-debounced-value";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { getStatusBadge, SIZE_LABEL, SOURCE_LABEL } from "../api/lead-labels";
import type { LeadSource, LeadStatus, LeadWithContacts } from "../api/leads";
import { useLeads } from "../api/leads";
import { CreateLeadModal } from "./create-lead-modal";
import { LeadListFilters, LeadListPagination } from "./lead-list-controls";

// --- Table --------------------------------------------------------------

function LeadsTable({
  items,
  onView,
}: {
  items: LeadWithContacts[];
  onView: (publicId: string) => void;
}) {
  return (
    <>
      <div className="divide-y divide-[var(--color-border)] lg:hidden">
        {items.map(({ lead, contacts }) => {
          const primary = contacts.find((contact) => contact.isPrimary);
          const status = getStatusBadge(lead.status);
          return (
            <article key={lead.publicId} className="p-4">
              <div className="flex flex-col gap-3 min-[560px]:flex-row min-[560px]:items-start min-[560px]:justify-between">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold text-[var(--color-text)]">
                    {lead.companyName ?? "-"}
                  </h3>
                  <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                    {lead.city ?? lead.country ?? "-"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant={status.variant}>{status.label}</Badge>
                </div>
              </div>

              <dl className="mt-3 grid grid-cols-1 gap-x-4 gap-y-2 text-xs min-[520px]:grid-cols-2">
                <div>
                  <dt className="text-[var(--color-text-faint)]">Primary contact</dt>
                  <dd className="mt-0.5 text-[var(--color-text)]">{primary?.name ?? "-"}</dd>
                  {primary?.jobTitle && (
                    <dd className="text-[var(--color-text-muted)]">{primary.jobTitle}</dd>
                  )}
                </div>
                <div>
                  <dt className="text-[var(--color-text-faint)]">Industry / size</dt>
                  <dd className="mt-0.5 text-[var(--color-text)]">{lead.industry ?? "-"}</dd>
                  <dd className="text-[var(--color-text-muted)]">
                    {SIZE_LABEL[lead.companySizeRange] ?? lead.companySizeRange}
                  </dd>
                </div>
                <div>
                  <dt className="text-[var(--color-text-faint)]">Source</dt>
                  <dd className="mt-0.5 text-[var(--color-text-muted)]">
                    {SOURCE_LABEL[lead.source] ?? lead.source}
                  </dd>
                </div>
                <div>
                  <dt className="text-[var(--color-text-faint)]">Attempts</dt>
                  <dd className="mt-0.5 tabular-nums text-[var(--color-text-muted)]">
                    {lead.numberOfAttempts}
                  </dd>
                </div>
                <div>
                  <dt className="text-[var(--color-text-faint)]">Updated</dt>
                  <dd className="mt-0.5 tabular-nums text-[var(--color-text-muted)]">
                    {new Date(lead.updatedAt).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </dd>
                </div>
                {lead.lostReason && (
                  <div>
                    <dt className="text-[var(--color-text-faint)]">Reason</dt>
                    <dd className="mt-0.5 text-[var(--color-text-muted)]">
                      {lead.lostReason.toLowerCase().replace(/_/g, " ")}
                    </dd>
                  </div>
                )}
              </dl>

              <div className="mt-4 flex flex-col gap-2 min-[520px]:flex-row">
                <Button
                  intent="utility"
                  leadingIcon={<ExternalLink size={13} />}
                  className="w-full"
                  onClick={() => onView(lead.publicId)}
                >
                  View
                </Button>
              </div>
            </article>
          );
        })}
      </div>

      <div className="scrollbar-calm hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)]">
              {[
                "Company",
                "Primary contact",
                "Industry / size",
                "Source",
                "Status",
                "Attempts",
                "Updated",
                "",
              ].map((h) => (
                <th
                  key={h}
                  className={`px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] ${
                    h === "Attempts" || h === "" ? "text-end" : "text-start"
                  }`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map(({ lead, contacts }) => {
              const primary = contacts.find((contact) => contact.isPrimary);
              const status = getStatusBadge(lead.status);
              return (
                <tr
                  key={lead.publicId}
                  className="border-b border-[var(--color-border)] transition-colors last:border-b-0 hover:bg-[var(--color-surface-2)]"
                >
                  {/* Company */}
                  <td className="px-4 py-3">
                    <p className="text-[13.5px] font-medium text-[var(--color-text)]">
                      {lead.companyName ?? (
                        <span className="text-[var(--color-text-faint)]">-</span>
                      )}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {lead.city ?? lead.country ?? "-"}
                    </p>
                  </td>

                  {/* Primary contact */}
                  <td className="px-4 py-3">
                    {primary ? (
                      <>
                        <p className="text-[13px] text-[var(--color-text)]">
                          {primary.name ?? "-"}
                        </p>
                        <p className="text-xs text-[var(--color-text-muted)]">
                          {primary.jobTitle ?? ""}
                        </p>
                      </>
                    ) : (
                      <span className="text-[var(--color-text-faint)]">-</span>
                    )}
                  </td>

                  {/* Industry / size */}
                  <td className="px-4 py-3">
                    <p className="text-[13px] text-[var(--color-text)]">{lead.industry ?? "-"}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {SIZE_LABEL[lead.companySizeRange] ?? lead.companySizeRange}
                    </p>
                  </td>

                  {/* Source */}
                  <td className="px-4 py-3 text-[13px] text-[var(--color-text-muted)]">
                    {SOURCE_LABEL[lead.source] ?? lead.source}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <Badge variant={status.variant}>{status.label}</Badge>
                    {lead.lostReason && (
                      <p className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">
                        {lead.lostReason.toLowerCase().replace(/_/g, " ")}
                      </p>
                    )}
                  </td>

                  {/* Attempts */}
                  <td className="px-4 py-3 text-end text-[13px] tabular-nums text-[var(--color-text-muted)]">
                    {lead.numberOfAttempts}
                  </td>

                  {/* Updated */}
                  <td className="px-4 py-3 text-[12.5px] tabular-nums text-[var(--color-text-muted)]">
                    {new Date(lead.updatedAt).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 text-end">
                    <div className="flex justify-end gap-2">
                      <Button
                        intent="utility"
                        leadingIcon={<ExternalLink size={13} />}
                        onClick={() => onView(lead.publicId)}
                      >
                        View
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function LeadsTableCardContent({
  isError,
  isPending,
  items,
  onView,
}: {
  isError: boolean;
  isPending: boolean;
  items: LeadWithContacts[];
  onView: (publicId: string) => void;
}) {
  if (isError) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center">
        <Users size={32} className="text-[var(--color-text-faint)]" />
        <p className="text-sm font-medium text-[var(--color-text-muted)]">Couldn't load leads</p>
        <p className="text-xs text-[var(--color-text-faint)]">Please try again shortly.</p>
      </div>
    );
  }

  if (isPending) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center">
        <p className="text-sm font-medium text-[var(--color-text-muted)]">Loading leads...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center">
        <Users size={32} className="text-[var(--color-text-faint)]" />
        <p className="text-sm font-medium text-[var(--color-text-muted)]">No leads found</p>
        <p className="text-xs text-[var(--color-text-faint)]">
          Try adjusting filters or search query
        </p>
      </div>
    );
  }

  return <LeadsTable items={items} onView={onView} />;
}

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

  function setArchivedFilter(value: boolean | undefined) {
    void navigate({
      search: (previous) => ({ ...previous, isArchived: value, page: 1 }),
    });
  }
  function setSort(nextSort: "createdAtAsc" | "createdAtDesc" | undefined) {
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
          setArchivedFilter(undefined);
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
