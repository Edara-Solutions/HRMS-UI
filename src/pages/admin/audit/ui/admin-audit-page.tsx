import { useNavigate, useSearch } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Shield } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { usePlatformAuditTrail } from "../api/audit";
import { AdminAuditTable } from "./admin-audit-table";

export function AdminAuditPage() {
  const { cursor, limit, companyPublicId, scope } = useSearch({
    from: "/admin/audit/",
  });
  const navigate = useNavigate({ from: "/admin/audit/" });
  const query = usePlatformAuditTrail({
    cursor: cursor,
    limit: limit,
    companyPublicId: companyPublicId,
    scope: scope,
  });

  const page = query.data;
  const items = page?.items ?? [];
  const hasMore = page?.hasMore ?? false;
  const nextCursor = page?.nextCursor ?? null;

  function loadMore() {
    if (!nextCursor) return;
    void navigate({
      search: (previous) => ({ ...previous, cursor: nextCursor }),
    });
  }

  function goBackToFirstPage() {
    void navigate({
      search: (previous) => {
        const { cursor: _cursor, ...rest } = previous;
        return rest;
      },
    });
  }

  function setScopeFilter(nextScope: "PLATFORM" | "COMPANY" | "") {
    void navigate({
      search: (previous) => ({
        ...previous,
        scope: nextScope || undefined,
        cursor: undefined,
      }),
    });
  }

  return (
    <div className="mx-auto max-w-[1480px]">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-[var(--color-text)]">
            Audit log
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Platform Audit Trail · retained event history
          </p>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        {(["", "PLATFORM", "COMPANY"] as const).map((s) => (
          <Button
            key={s === "" ? "all" : s}
            variant="ghost"
            size="sm"
            pressed={scope === s}
            onClick={() => setScopeFilter(s)}
          >
            {s === "" ? "All scopes" : s === "PLATFORM" ? "Platform" : "Company"}
          </Button>
        ))}

        <div className="relative w-full sm:ms-auto sm:max-w-xs">
          <Input
            type="text"
            placeholder="Company public id (UUID)"
            defaultValue={companyPublicId ?? ""}
            onChange={(event) => {
              const value = event.target.value.trim();
              void navigate({
                search: (previous) => ({
                  ...previous,
                  companyPublicId: value || undefined,
                  cursor: undefined,
                }),
              });
            }}
          />
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {query.isPending ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <Shield size={32} className="text-[var(--color-text-faint)]" />
              <p className="text-sm font-medium text-[var(--color-text-muted)]">
                Loading audit trail…
              </p>
            </div>
          ) : query.isError ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <Shield size={32} className="text-[var(--color-text-faint)]" />
              <p className="text-sm font-medium text-[var(--color-text-muted)]">
                Audit trail could not be loaded
              </p>
              <Button intent="utility" size="sm" onClick={() => query.refetch()}>
                Retry
              </Button>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <Shield size={32} className="text-[var(--color-text-faint)]" />
              <p className="text-sm font-medium text-[var(--color-text-muted)]">No audit events</p>
            </div>
          ) : (
            <AdminAuditTable items={items} />
          )}
        </CardContent>
        <div className="flex flex-col gap-3 border-t border-[var(--color-border)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs text-[var(--color-text-muted)]">
            {items.length} event{items.length === 1 ? "" : "s"}
          </span>
          <div className="flex items-center gap-1">
            {cursor && (
              <Button
                variant="nav"
                size="iconXs"
                className="btn-nav-prev"
                onClick={goBackToFirstPage}
                aria-label="First page"
                title="First page"
              >
                <ChevronLeft size={14} />
              </Button>
            )}
            {hasMore && nextCursor ? (
              <Button
                variant="nav"
                size="iconXs"
                className="btn-nav-next"
                onClick={loadMore}
                aria-label="Load more"
                title="Load more"
              >
                <ChevronRight size={14} />
              </Button>
            ) : null}
          </div>
        </div>
      </Card>
    </div>
  );
}
