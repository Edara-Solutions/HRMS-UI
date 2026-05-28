import type { SubscriptionStatus } from "@/admin/companies/api";
import { dummyCompaniesWithConfig } from "@/admin/companies/fixtures";
import type { CompanyWithConfig } from "@/admin/companies/fixtures";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { Building2, ExternalLink, Globe, Plus, Search } from "lucide-react";

// ─── Subscription status helpers ──────────────────────────────────────────────

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

// ─── Company code square ───────────────────────────────────────────────────────

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

// ─── Table ─────────────────────────────────────────────────────────────────────

function CompaniesTable({ items }: { items: CompanyWithConfig[] }) {
  return (
    <div className="scrollbar-calm overflow-x-auto">
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
                    <p className="text-[13.5px] font-medium text-[var(--color-text)]">{co.name}</p>
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
                {co.config?.planName ?? <span className="text-[var(--color-text-faint)]">–</span>}
              </td>

              {/* Status */}
              <td className="px-4 py-3">
                {co.config ? (
                  <Badge variant={statusBadgeVariant[co.config.subscriptionStatus]}>
                    {statusLabel[co.config.subscriptionStatus]}
                  </Badge>
                ) : (
                  <Badge variant="default">–</Badge>
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
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

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
            {dummyCompaniesWithConfig.length} tenants · manage profiles and subscriptions
          </p>
        </div>
        <Button intent="cta" leadingIcon={<Plus size={15} />}>
          Add company
        </Button>
      </div>

      {/* Filter bar */}
      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search
            size={14}
            className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
            aria-hidden="true"
          />
          <Input
            type="search"
            placeholder="Search by name, code or country…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="ps-8"
          />
        </div>
        <div className="ms-auto flex items-center gap-2">
          <span className="text-xs text-[var(--color-text-muted)]">
            {filtered.length} of {dummyCompaniesWithConfig.length}
          </span>
        </div>
      </div>

      {/* Table card */}
      <Card>
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
        <div className="flex items-center justify-between border-t border-[var(--color-border)] px-4 py-3">
          <span className="text-xs text-[var(--color-text-muted)]">
            Page {currentPage} of {totalPages} · showing {visible.length} companies
          </span>
          <div className="flex items-center gap-1">
            <Button
              intent="action"
              size="xs"
              disabled={currentPage <= 1}
              onClick={() => setPage(currentPage - 1)}
            >
              Previous
            </Button>
            <Button
              intent="action"
              size="xs"
              disabled={currentPage >= totalPages}
              onClick={() => setPage(currentPage + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
