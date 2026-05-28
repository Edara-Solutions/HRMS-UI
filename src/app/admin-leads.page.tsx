import type { LeadWithContacts } from "@/admin/leads/api";
import type { LeadSource, LeadStatus } from "@/admin/leads/api";
import { dummyLeads } from "@/admin/leads/fixtures";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, ExternalLink, Plus, Search, Users } from "lucide-react";

// â”€â”€â”€ Status helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const STATUS_BADGE: Record<
  LeadStatus,
  { variant: "success" | "primary" | "warning" | "danger" | "info" | "default"; label: string }
> = {
  NEW: { variant: "default", label: "New" },
  NO_ANSWER: { variant: "default", label: "No answer" },
  WRONG_NUMBER: { variant: "danger", label: "Wrong number" },
  CONTACTED: { variant: "info", label: "Contacted" },
  FOLLOWING_UP: { variant: "info", label: "Following up" },
  QUALIFIED: { variant: "primary", label: "Qualified" },
  NOT_QUALIFIED: { variant: "default", label: "Not qualified" },
  NOT_INTERESTED: { variant: "default", label: "Not interested" },
  DEMO_SCHEDULED: { variant: "primary", label: "Demo scheduled" },
  WAITING_QUOTATION: { variant: "warning", label: "Waiting quote" },
  QUOTATION_SENT: { variant: "warning", label: "Quote sent" },
  TRIAL_STARTED: { variant: "primary", label: "Trial" },
  NEGOTIATION: { variant: "warning", label: "Negotiation" },
  WON_CONVERTED: { variant: "success", label: "Won" },
  LOST: { variant: "danger", label: "Lost" },
  REJOINED: { variant: "success", label: "Rejoined" },
};

const SOURCE_LABEL: Record<LeadSource, string> = {
  LINKEDIN: "LinkedIn",
  REFERRAL: "Referral",
  WEBSITE: "Website",
  COLD_CALL: "Cold call",
  EMAIL_CAMPAIGN: "Email",
  EVENT: "Event",
  OTHER: "Other",
};

const SIZE_LABEL: Record<string, string> = {
  "1_TO_10": "1â€“10",
  "11_TO_20": "11â€“20",
  "21_TO_50": "21â€“50",
  "51_TO_100": "51â€“100",
  "101_TO_250": "101â€“250",
  "251_TO_500": "251â€“500",
  ABOVE_500: "500+",
};

const ALL_STATUSES: LeadStatus[] = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "DEMO_SCHEDULED",
  "NEGOTIATION",
  "WON_CONVERTED",
  "LOST",
];

// â”€â”€â”€ Table â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function LeadsTable({ items }: { items: LeadWithContacts[] }) {
  return (
    <>
      <div className="divide-y divide-[var(--color-border)] lg:hidden">
        {items.map(({ lead, contacts }) => {
          const primary = contacts.find((c) => c.isPrimary) ?? contacts[0];
          const status = STATUS_BADGE[lead.status];
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

              <Button
                intent="utility"
                leadingIcon={<ExternalLink size={13} />}
                className="mt-4 w-full min-[520px]:w-auto"
              >
                View
              </Button>
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
              const primary = contacts.find((c) => c.isPrimary) ?? contacts[0];
              const status = STATUS_BADGE[lead.status];
              return (
                <tr
                  key={lead.publicId}
                  className="border-b border-[var(--color-border)] transition-colors last:border-b-0 hover:bg-[var(--color-surface-2)]"
                >
                  {/* Company */}
                  <td className="px-4 py-3">
                    <p className="text-[13.5px] font-medium text-[var(--color-text)]">
                      {lead.companyName ?? (
                        <span className="text-[var(--color-text-faint)]">â€“</span>
                      )}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {lead.city ?? lead.country ?? "â€“"}
                    </p>
                  </td>

                  {/* Primary contact */}
                  <td className="px-4 py-3">
                    {primary ? (
                      <>
                        <p className="text-[13px] text-[var(--color-text)]">
                          {primary.name ?? "â€“"}
                        </p>
                        <p className="text-xs text-[var(--color-text-muted)]">
                          {primary.jobTitle ?? ""}
                        </p>
                      </>
                    ) : (
                      <span className="text-[var(--color-text-faint)]">â€“</span>
                    )}
                  </td>

                  {/* Industry / size */}
                  <td className="px-4 py-3">
                    <p className="text-[13px] text-[var(--color-text)]">{lead.industry ?? "â€“"}</p>
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
                    <Button intent="utility" leadingIcon={<ExternalLink size={13} />}>
                      View
                    </Button>
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

// â”€â”€â”€ Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function AdminLeadsPage() {
  const { page, pageSize, q, status } = useSearch({ from: "/admin/leads" });
  const navigate = useNavigate({ from: "/admin/leads" });
  const query = q ?? "";
  const statusFilter = status ?? "";

  function setQuery(nextQuery: string) {
    void navigate({
      search: (previous) => ({
        ...previous,
        q: nextQuery || undefined,
        page: 1,
      }),
    });
  }

  function setStatusFilter(nextStatus: LeadStatus | "") {
    void navigate({
      search: (previous) => ({
        ...previous,
        status: nextStatus || undefined,
        page: 1,
      }),
    });
  }

  function setPage(nextPage: number) {
    void navigate({
      search: (previous) => ({
        ...previous,
        page: nextPage,
      }),
    });
  }

  const filtered = dummyLeads.filter(({ lead }) => {
    if (statusFilter && lead.status !== statusFilter) return false;
    if (query) {
      const loweredQuery = query.toLowerCase();
      return (
        lead.companyName?.toLowerCase().includes(loweredQuery) ||
        lead.city?.toLowerCase().includes(loweredQuery) ||
        lead.country?.toLowerCase().includes(loweredQuery) ||
        lead.industry?.toLowerCase().includes(loweredQuery)
      );
    }
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const totalByStatus = dummyLeads.reduce<Record<string, number>>((acc, { lead }) => {
    acc[lead.status] = (acc[lead.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-[1480px]">
      {/* Page header */}
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-[var(--color-text)]">Leads</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            {dummyLeads.length} total leads Â· CRM sales pipeline
          </p>
        </div>
        <Button intent="cta" leadingIcon={<Plus size={15} />} className="w-full sm:w-auto">
          Add lead
        </Button>
      </div>

      {/* Quick status chips */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          pressed={statusFilter === ""}
          onClick={() => setStatusFilter("")}
        >
          All ({dummyLeads.length})
        </Button>
        {ALL_STATUSES.map((s) => (
          <Button
            key={s}
            variant="ghost"
            size="sm"
            pressed={statusFilter === s}
            onClick={() => setStatusFilter(s)}
          >
            {STATUS_BADGE[s].label}
            {totalByStatus[s] ? (
              <span className="ms-1.5 tabular-nums opacity-60">({totalByStatus[s]})</span>
            ) : null}
          </Button>
        ))}
      </div>

      {/* Search */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search
            size={14}
            className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
            aria-hidden="true"
          />
          <Input
            type="search"
            placeholder="Search by company, city, industryâ€¦"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="ps-8"
          />
        </div>
        <span className="text-xs text-[var(--color-text-muted)] sm:ms-auto">
          {filtered.length} of {dummyLeads.length}
        </span>
      </div>

      {/* Table card */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {visible.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <Users size={32} className="text-[var(--color-text-faint)]" />
              <p className="text-sm font-medium text-[var(--color-text-muted)]">No leads found</p>
              <p className="text-xs text-[var(--color-text-faint)]">
                Try adjusting filters or search query
              </p>
            </div>
          ) : (
            <LeadsTable items={visible} />
          )}
        </CardContent>
        <div className="flex flex-col gap-3 border-t border-[var(--color-border)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs text-[var(--color-text-muted)]">
            {visible.length} of {filtered.length} leads
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="nav"
              size="iconXs"
              className="btn-nav-prev"
              disabled={currentPage <= 1}
              onClick={() => setPage(currentPage - 1)}
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
              onClick={() => setPage(currentPage + 1)}
              aria-label="Next page"
              title="Next page"
            >
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
