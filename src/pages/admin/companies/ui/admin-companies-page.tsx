import { useNavigate, useSearch } from "@tanstack/react-router";
import { Building2, ChevronLeft, ChevronRight, ExternalLink, Globe, Search } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Status } from "@/shared/ui/status";
import type { Company } from "../api/companies";
import { useCompanies } from "../api/companies";

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

function CompanyStatusBadges({ company }: { company: Company }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <Status status={company.lifecycleStatus} />
      <Status
        status={company.isActive ? "ACTIVE" : "SUSPENDED"}
        label={company.isActive ? "Enabled" : "Disabled"}
      />
    </div>
  );
}

function formatCompanyCreatedAt(createdAt: string) {
  return new Date(createdAt).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function CompaniesTable({
  items,
  onView,
}: {
  items: Company[];
  onView: (publicId: string) => void;
}) {
  return (
    <>
      <div className="divide-y divide-[var(--color-border)] lg:hidden">
        {items.map((company) => (
          <article key={company.publicId} className="p-4">
            <div className="flex items-start gap-3">
              <CompanySquare code={company.companyCode} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-2 min-[520px]:flex-row min-[520px]:items-start min-[520px]:justify-between">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-[var(--color-text)]">
                      {company.name}
                    </h3>
                    {company.website && (
                      <a
                        href={company.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-0.5 flex min-w-0 items-center gap-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
                      >
                        <Globe size={11} className="shrink-0" />
                        <span className="truncate">
                          {company.website.replace(/^https?:\/\//, "")}
                        </span>
                      </a>
                    )}
                  </div>
                  <CompanyStatusBadges company={company} />
                </div>

                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  <div>
                    <dt className="text-[var(--color-text-faint)]">Code</dt>
                    <dd className="mt-0.5 font-mono text-[var(--color-text-muted)]">
                      {company.companyCode}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[var(--color-text-faint)]">Country</dt>
                    <dd className="mt-0.5 text-[var(--color-text-muted)]">{company.country}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--color-text-faint)]">Created</dt>
                    <dd className="mt-0.5 tabular-nums text-[var(--color-text-muted)]">
                      {formatCompanyCreatedAt(company.createdAt)}
                    </dd>
                  </div>
                </dl>

                <Button
                  intent="utility"
                  leadingIcon={<ExternalLink size={13} />}
                  className="mt-4 w-full min-[520px]:w-auto"
                  onClick={() => onView(company.publicId)}
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
              {["Company", "Code", "Country", "Status", "Created", ""].map((heading) => (
                <th
                  key={heading}
                  className={`px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] ${
                    heading === "" ? "text-end" : "text-start"
                  }`}
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((company) => (
              <tr
                key={company.publicId}
                className="border-b border-[var(--color-border)] transition-colors last:border-b-0 hover:bg-[var(--color-surface-2)]"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <CompanySquare code={company.companyCode} />
                    <div>
                      <p className="text-[13.5px] font-medium text-[var(--color-text)]">
                        {company.name}
                      </p>
                      {company.website && (
                        <a
                          href={company.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
                        >
                          <Globe size={11} />
                          {company.website.replace(/^https?:\/\//, "")}
                        </a>
                      )}
                    </div>
                  </div>
                </td>

                <td className="px-4 py-3">
                  <code className="rounded-[var(--radius-sm)] bg-[var(--color-surface-2)] px-1.5 py-0.5 text-[11.5px] font-mono text-[var(--color-text-muted)]">
                    {company.companyCode}
                  </code>
                </td>

                <td className="px-4 py-3 text-[13.5px] text-[var(--color-text-muted)]">
                  {company.country}
                </td>

                <td className="px-4 py-3">
                  <CompanyStatusBadges company={company} />
                </td>

                <td className="px-4 py-3 text-[12.5px] tabular-nums text-[var(--color-text-muted)]">
                  {formatCompanyCreatedAt(company.createdAt)}
                </td>

                <td className="px-4 py-3 text-end">
                  <Button
                    intent="utility"
                    leadingIcon={<ExternalLink size={13} />}
                    onClick={() => onView(company.publicId)}
                  >
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

function CompaniesTableCardContent({
  isError,
  isPending,
  items,
  onView,
}: {
  isError: boolean;
  isPending: boolean;
  items: Company[];
  onView: (publicId: string) => void;
}) {
  if (isError) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center">
        <Building2 size={32} className="text-[var(--color-text-faint)]" />
        <p className="text-sm font-medium text-[var(--color-text-muted)]">
          Couldn't load companies
        </p>
        <p className="text-xs text-[var(--color-text-faint)]">Please try again shortly.</p>
      </div>
    );
  }

  if (isPending) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center">
        <p className="text-sm font-medium text-[var(--color-text-muted)]">Loading companies...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center">
        <Building2 size={32} className="text-[var(--color-text-faint)]" />
        <p className="text-sm font-medium text-[var(--color-text-muted)]">No companies found</p>
        <p className="text-xs text-[var(--color-text-faint)]">Try adjusting your search query</p>
      </div>
    );
  }

  return <CompaniesTable items={items} onView={onView} />;
}

export function AdminCompaniesPage() {
  const { page, pageSize, q } = useSearch({ from: "/admin/companies/" });
  const navigate = useNavigate({ from: "/admin/companies/" });
  const query = q ?? "";

  const { data, isPending, isError } = useCompanies({ page, limit: pageSize });

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

  function viewCompany(publicId: string) {
    void navigate({ to: "/admin/companies/$publicId", params: { publicId } });
  }

  const lowerQuery = query.toLowerCase();
  const rows: Company[] = [];
  for (const company of data?.data ?? []) {
    const matchesQuery =
      !query ||
      company.name.toLowerCase().includes(lowerQuery) ||
      company.companyCode.toLowerCase().includes(lowerQuery) ||
      company.country.toLowerCase().includes(lowerQuery);
    if (matchesQuery) {
      rows.push(company);
    }
  }

  const totalItems = data?.meta.total ?? 0;
  const currentPage = data?.meta.page ?? page;
  const totalPages = Math.max(1, data?.meta.totalPages ?? 1);

  return (
    <div className="mx-auto max-w-[1480px]">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-[var(--color-text)]">
            Companies
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            {totalItems} tenants - manage profiles and lifecycle status
          </p>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search
            size={14}
            className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
            aria-hidden="true"
          />
          <Input
            type="search"
            placeholder="Search by name, code or country..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="ps-8"
          />
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <CompaniesTableCardContent
            isError={isError}
            isPending={isPending}
            items={rows}
            onView={viewCompany}
          />
        </CardContent>

        <div className="flex flex-col gap-3 border-t border-[var(--color-border)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs text-[var(--color-text-muted)]">
            {rows.length} of {totalItems} companies
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
