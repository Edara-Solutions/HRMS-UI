import type { SubscriptionStatus } from "@/admin/companies/api";
import { dummyCompaniesWithConfig } from "@/admin/companies/fixtures";
import type { CompanyWithConfig } from "@/admin/companies/fixtures";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { useNavigate, useSearch } from "@tanstack/react-router";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Globe,
  Plus,
  Search,
} from "lucide-react";

// â”€â”€â”€ Subscription status helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const statusBadgeVariant: Record<
  SubscriptionStatus,
  "success" | "primary" | "warning" | "danger" | "default"
> = {
  ACTIVE: "success",
  TRIAL: "primary",
  FROZEN: "warning",
  CANCELLED: "danger",
  EXPIRED: "default",
};

const statusLabel: Record<SubscriptionStatus, string> = {
  ACTIVE: "Active",
  TRIAL: "Trial",
  FROZEN: "Frozen",
  CANCELLED: "Cancelled",
  EXPIRED: "Expired",
};

// â”€â”€â”€ Company code square â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function CompanySquare({ code }: { code: string }) {
  return (
    <span
      className="inline-flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary-soft)] text-[12px] font-bold tabular-nums text-[var(--color-primary)]"
      aria-hidden="true"
    >
      {code.slice(0, 2)}
    </span>
  );
}

// â”€â”€â”€ Table â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function CompaniesTable({ items }: { items: CompanyWithConfig[] }) {
  return (
    <>
      <div className="divide-y divide-[var(--color-border)] lg:hidden">
        {items.map((co) => (
          <article key={co.publicId} className="p-4">
            <div className="flex items-start gap-3">
              <CompanySquare code={co.companyCode} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-2 min-[520px]:flex-row min-[520px]:items-start min-[520px]:justify-between">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-[var(--color-text)]">
                      {co.name}
                    </h3>
                    {co.website && (
                      <a
                        href={co.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-0.5 flex min-w-0 items-center gap-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
                      >
                        <Globe size={11} className="shrink-0" />
                        <span className="truncate">{co.website.replace(/^https?:\/\//, "")}</span>
                      </a>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {co.config ? (
                      <Badge variant={statusBadgeVariant[co.config.subscriptionStatus]}>
                        {statusLabel[co.config.subscriptionStatus]}
                      </Badge>
                    ) : (
                      <Badge variant="default">-</Badge>
                    )}
                    {!co.isActive && <Badge variant="danger">Inactive</Badge>}
                  </div>
                </div>

                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  <div>
                    <dt className="text-[var(--color-text-faint)]">Code</dt>
                    <dd className="mt-0.5 font-mono text-[var(--color-text-muted)]">
                      {co.companyCode}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[var(--color-text-faint)]">Country</dt>
                    <dd className="mt-0.5 text-[var(--color-text-muted)]">{co.country}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--color-text-faint)]">Plan</dt>
                    <dd className="mt-0.5 text-[var(--color-text)]">
                      {co.config?.planName ?? "-"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[var(--color-text-faint)]">Created</dt>
                    <dd className="mt-0.5 tabular-nums text-[var(--color-text-muted)]">
                      {new Date(co.createdAt).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </dd>
                  </div>
                </dl>

                <Button
                  intent="utility"
                  leadingIcon={<ExternalLink size={13} />}
                  className="mt-4 w-full min-[520px]:w-auto"
                >
                  View
                </Button>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="scrollbar-calm hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[720px]">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)]">
              {["Company", "Code", "Country", "Plan", "Status", "Created", ""].map((h) => (
                <th
                  key={h}
                  className={`px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] ${
                    h === "" ? "text-end" : "text-start"
                  }`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((co) => (
              <tr
                key={co.publicId}
                className="border-b border-[var(--color-border)] transition-colors last:border-b-0 hover:bg-[var(--color-surface-2)]"
              >
                {/* Company */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <CompanySquare code={co.companyCode} />
                    <div>
                      <p className="text-[13.5px] font-medium text-[var(--color-text)]">
                        {co.name}
                      </p>
                      {co.website && (
                        <a
                          href={co.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
                        >
                          <Globe size={11} />
                          {co.website.replace(/^https?:\/\//, "")}
                        </a>
                      )}
                    </div>
                  </div>
                </td>

                {/* Code */}
                <td className="px-4 py-3">
                  <code className="rounded-[var(--radius-sm)] bg-[var(--color-surface-2)] px-1.5 py-0.5 text-[11.5px] font-mono text-[var(--color-text-muted)]">
                    {co.companyCode}
                  </code>
                </td>

                {/* Country */}
                <td className="px-4 py-3 text-[13.5px] text-[var(--color-text-muted)]">
                  {co.country}
                </td>

                {/* Plan */}
                <td className="px-4 py-3 text-[13.5px] text-[var(--color-text)]">
                  {co.config?.planName ?? (
                    <span className="text-[var(--color-text-faint)]">â€“</span>
                  )}
                </td>

                {/* Status */}
                <td className="px-4 py-3">
                  {co.config ? (
                    <Badge variant={statusBadgeVariant[co.config.subscriptionStatus]}>
                      {statusLabel[co.config.subscriptionStatus]}
                    </Badge>
                  ) : (
                    <Badge variant="default">â€“</Badge>
                  )}
                  {!co.isActive && (
                    <Badge variant="danger" className="ms-1.5">
                      Inactive
                    </Badge>
                  )}
                </td>

                {/* Created */}
                <td className="px-4 py-3 text-[12.5px] tabular-nums text-[var(--color-text-muted)]">
                  {new Date(co.createdAt).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </td>

                {/* Actions */}
                <td className="px-4 py-3 text-end">
                  <Button intent="utility" leadingIcon={<ExternalLink size={13} />}>
                    View
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// â”€â”€â”€ Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function AdminCompaniesPage() {
  const { page, pageSize, q } = useSearch({ from: "/admin/companies" });
  const navigate = useNavigate({ from: "/admin/companies" });
  const query = q ?? "";

  function setQuery(nextQuery: string) {
    void navigate({
      search: (previous) => ({
        ...previous,
        q: nextQuery || undefined,
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

  const filtered = dummyCompaniesWithConfig.filter(
    (co) =>
      !query ||
      co.name.toLowerCase().includes(query.toLowerCase()) ||
      co.companyCode.toLowerCase().includes(query.toLowerCase()) ||
      co.country.toLowerCase().includes(query.toLowerCase()),
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="mx-auto max-w-[1480px]">
      {/* Page header */}
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-[var(--color-text)]">
            Companies
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            {dummyCompaniesWithConfig.length} tenants Â· manage profiles and subscriptions
          </p>
        </div>
        <Button intent="cta" leadingIcon={<Plus size={15} />} className="w-full sm:w-auto">
          Add company
        </Button>
      </div>

      {/* Filter bar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search
            size={14}
            className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
            aria-hidden="true"
          />
          <Input
            type="search"
            placeholder="Search by name, code or countryâ€¦"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="ps-8"
          />
        </div>
        <div className="flex items-center gap-2 sm:ms-auto">
          <span className="text-xs text-[var(--color-text-muted)]">
            {filtered.length} of {dummyCompaniesWithConfig.length}
          </span>
        </div>
      </div>

      {/* Table card */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {visible.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <Building2 size={32} className="text-[var(--color-text-faint)]" />
              <p className="text-sm font-medium text-[var(--color-text-muted)]">
                No companies found
              </p>
              <p className="text-xs text-[var(--color-text-faint)]">
                Try adjusting your search query
              </p>
            </div>
          ) : (
            <CompaniesTable items={visible} />
          )}
        </CardContent>

        {/* Pagination footer */}
        <div className="flex flex-col gap-3 border-t border-[var(--color-border)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs text-[var(--color-text-muted)]">
            {visible.length} of {filtered.length} companies
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
