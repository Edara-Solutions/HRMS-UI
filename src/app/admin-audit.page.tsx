import type { AuditEntry, AuditOutcome } from "@/admin/audit/api";
import { dummyAuditEntries } from "@/admin/audit/fixtures";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Search, Shield } from "lucide-react";

// â”€â”€â”€ Outcome badge â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function OutcomeBadge({ outcome }: { outcome: AuditOutcome }) {
  return (
    <Badge variant={outcome === "success" ? "success" : "danger"}>
      {outcome === "success" ? "Success" : "Failure"}
    </Badge>
  );
}

// â”€â”€â”€ Module badge â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const MODULE_VARIANT: Record<string, "primary" | "info" | "warning" | "default"> = {
  auth: "primary",
  users: "info",
  rbac: "warning",
};

function ModuleBadge({ module }: { module: string }) {
  const variant = MODULE_VARIANT[module] ?? "default";
  return <Badge variant={variant}>{module}</Badge>;
}

// â”€â”€â”€ Table â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function AuditTable({ items }: { items: AuditEntry[] }) {
  return (
    <>
      <div className="divide-y divide-[var(--color-border)] lg:hidden">
        {items.map((entry) => (
          <article
            key={`${entry.action}-${entry.createdAt}-${entry.targetPublicId ?? "system"}`}
            className="p-4"
          >
            <div className="flex flex-col gap-3 min-[560px]:flex-row min-[560px]:items-start min-[560px]:justify-between">
              <div className="min-w-0">
                <code className="break-all text-[12.5px] font-mono text-[var(--color-text)]">
                  {entry.action}
                </code>
                <p className="mt-1 text-xs tabular-nums text-[var(--color-text-muted)]">
                  {new Date(entry.createdAt).toLocaleString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <ModuleBadge module={entry.module} />
                <OutcomeBadge outcome={entry.outcome} />
              </div>
            </div>

            <dl className="mt-3 grid grid-cols-1 gap-x-4 gap-y-2 text-xs min-[520px]:grid-cols-2">
              <div>
                <dt className="text-[var(--color-text-faint)]">Target type</dt>
                <dd className="mt-0.5 text-[var(--color-text-muted)]">{entry.targetType ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-[var(--color-text-faint)]">Target ID</dt>
                <dd className="mt-0.5 break-all font-mono text-[var(--color-text-muted)]">
                  {entry.targetPublicId ?? "-"}
                </dd>
              </div>
            </dl>

            <Button intent="utility" className="mt-4 w-full min-[520px]:w-auto">
              Details
            </Button>
          </article>
        ))}
      </div>

      <div className="scrollbar-calm hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[760px]">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)]">
              {["Action", "Module", "Target type", "Target ID", "Outcome", "Timestamp", ""].map(
                (h) => (
                  <th
                    key={h}
                    className={`px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] ${
                      h === "" ? "text-end" : "text-start"
                    }`}
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {items.map((entry) => (
              <tr
                key={`${entry.action}-${entry.createdAt}-${entry.targetPublicId ?? "system"}`}
                className="border-b border-[var(--color-border)] transition-colors last:border-b-0 hover:bg-[var(--color-surface-2)]"
              >
                {/* Action */}
                <td className="px-4 py-3">
                  <code className="text-[12.5px] font-mono text-[var(--color-text)]">
                    {entry.action}
                  </code>
                </td>

                {/* Module */}
                <td className="px-4 py-3">
                  <ModuleBadge module={entry.module} />
                </td>

                {/* Target type */}
                <td className="px-4 py-3 text-[12.5px] text-[var(--color-text-muted)]">
                  {entry.targetType ?? <span className="text-[var(--color-text-faint)]">â€“</span>}
                </td>

                {/* Target ID */}
                <td className="max-w-[140px] truncate px-4 py-3 text-[11.5px] font-mono text-[var(--color-text-muted)]">
                  {entry.targetPublicId ?? (
                    <span className="text-[var(--color-text-faint)]">â€“</span>
                  )}
                </td>

                {/* Outcome */}
                <td className="px-4 py-3">
                  <OutcomeBadge outcome={entry.outcome} />
                </td>

                {/* Timestamp */}
                <td className="px-4 py-3 text-[12.5px] tabular-nums text-[var(--color-text-muted)]">
                  {new Date(entry.createdAt).toLocaleString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>

                {/* Metadata drawer trigger */}
                <td className="px-4 py-3 text-end">
                  <Button intent="utility" size="xs">
                    Details
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

export function AdminAuditPage() {
  const { page, pageSize, q, outcome } = useSearch({ from: "/admin/audit" });
  const navigate = useNavigate({ from: "/admin/audit" });
  const query = q ?? "";
  const outcomeFilter = outcome ?? "";

  function setQuery(nextQuery: string) {
    void navigate({
      search: (previous) => ({
        ...previous,
        q: nextQuery || undefined,
        page: 1,
      }),
    });
  }

  function setOutcomeFilter(nextOutcome: AuditOutcome | "") {
    void navigate({
      search: (previous) => ({
        ...previous,
        outcome: nextOutcome || undefined,
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

  const filtered = dummyAuditEntries.filter((entry) => {
    if (outcomeFilter && entry.outcome !== outcomeFilter) return false;
    if (query) {
      const loweredQuery = query.toLowerCase();
      return (
        entry.action.toLowerCase().includes(loweredQuery) ||
        entry.module.toLowerCase().includes(loweredQuery) ||
        (entry.targetType?.toLowerCase().includes(loweredQuery) ?? false) ||
        (entry.targetPublicId?.toLowerCase().includes(loweredQuery) ?? false)
      );
    }
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const successCount = dummyAuditEntries.filter((e) => e.outcome === "success").length;
  const failureCount = dummyAuditEntries.filter((e) => e.outcome === "failure").length;

  return (
    <div className="mx-auto max-w-[1480px]">
      {/* Page header */}
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-[var(--color-text)]">
            Audit log
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            {successCount} successes Â· {failureCount} failures Â· platform event history
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        {/* Outcome chips */}
        {(["", "success", "failure"] as const).map((o) => (
          <Button
            key={o === "" ? "all" : o}
            variant="ghost"
            size="sm"
            pressed={outcomeFilter === o}
            onClick={() => setOutcomeFilter(o)}
          >
            {o === "" ? "All outcomes" : o === "success" ? "Success" : "Failure"}
          </Button>
        ))}

        {/* Search */}
        <div className="relative w-full sm:ms-auto sm:max-w-xs">
          <Search
            size={14}
            className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
            aria-hidden="true"
          />
          <Input
            type="search"
            placeholder="Search action, module, targetâ€¦"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="ps-8"
          />
        </div>
      </div>

      {/* Table card */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {visible.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <Shield size={32} className="text-[var(--color-text-faint)]" />
              <p className="text-sm font-medium text-[var(--color-text-muted)]">
                No audit entries match
              </p>
              <p className="text-xs text-[var(--color-text-faint)]">Try adjusting your filters</p>
            </div>
          ) : (
            <AuditTable items={visible} />
          )}
        </CardContent>
        <div className="flex flex-col gap-3 border-t border-[var(--color-border)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs text-[var(--color-text-muted)]">
            {visible.length} of {filtered.length} entries
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
