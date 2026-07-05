import { useNavigate, useSearch } from "@tanstack/react-router";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Lock,
  Search,
  XCircle,
} from "lucide-react";
import type { ReactNode } from "react";
import type { SubscriptionStatus } from "../api/subscriptions";
import { dummyCompaniesWithConfig } from "../api/subscription-fixtures";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";

// ─── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  SubscriptionStatus,
  {
    variant: "success" | "primary" | "warning" | "danger" | "default";
    label: string;
    icon: ReactNode;
  }
> = {
  ACTIVE: { variant: "success", label: "Active", icon: <CheckCircle2 size={11} /> },
  TRIAL: { variant: "primary", label: "Trial", icon: <Clock size={11} /> },
  FROZEN: { variant: "warning", label: "Frozen", icon: <Lock size={11} /> },
  CANCELLED: { variant: "danger", label: "Cancelled", icon: <XCircle size={11} /> },
  EXPIRED: { variant: "default", label: "Expired", icon: <AlertTriangle size={11} /> },
};

const ALL_STATUSES: SubscriptionStatus[] = ["ACTIVE", "TRIAL", "FROZEN", "CANCELLED", "EXPIRED"];

// ─── Site status flags ─────────────────────────────────────────────────────────

function SiteFlags({
  flags,
}: {
  flags: {
    isFrozen?: boolean;
    isBlocked?: boolean;
    isReadOnly?: boolean;
    isUnderMaintenance?: boolean;
  };
}) {
  const active = [
    flags.isFrozen && "Frozen",
    flags.isBlocked && "Blocked",
    flags.isReadOnly && "Read-only",
    flags.isUnderMaintenance && "Maintenance",
  ].filter(Boolean) as string[];

  if (active.length === 0) return <span className="text-[var(--color-text-faint)] text-xs">–</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {active.map((f) => (
        <Badge key={f} variant="warning">
          {f}
        </Badge>
      ))}
    </div>
  );
}

// ─── Table ─────────────────────────────────────────────────────────────────────

function SubscriptionsTable({ items }: { items: typeof dummyCompaniesWithConfig }) {
  return (
    <>
      <div className="divide-y divide-[var(--color-border)] lg:hidden">
        {items.map((co) => {
          const cfg = co.config;
          const statusCfg = cfg ? STATUS_CONFIG[cfg.subscriptionStatus] : null;
          return (
            <article key={co.publicId} className="p-4">
              <div className="flex flex-col gap-3 min-[560px]:flex-row min-[560px]:items-start min-[560px]:justify-between">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold text-[var(--color-text)]">
                    {co.name}
                  </h3>
                  <code className="text-[11px] text-[var(--color-text-muted)]">
                    {co.companyCode}
                  </code>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {statusCfg ? (
                    <Badge variant={statusCfg.variant}>
                      <span className="me-1 inline-flex">{statusCfg.icon}</span>
                      {statusCfg.label}
                    </Badge>
                  ) : (
                    <Badge variant="default">-</Badge>
                  )}
                </div>
              </div>

              <dl className="mt-3 grid grid-cols-1 gap-x-4 gap-y-2 text-xs min-[520px]:grid-cols-2">
                <div>
                  <dt className="text-[var(--color-text-faint)]">Plan</dt>
                  <dd className="mt-0.5 text-[var(--color-text)]">{cfg?.planName ?? "-"}</dd>
                </div>
                <div>
                  <dt className="text-[var(--color-text-faint)]">Site flags</dt>
                  <dd className="mt-0.5">
                    {cfg?.subscriptionStatus === "FROZEN" ? (
                      <SiteFlags flags={{ isFrozen: true }} />
                    ) : (
                      <SiteFlags flags={{}} />
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-[var(--color-text-faint)]">Trial ends</dt>
                  <dd className="mt-0.5 tabular-nums text-[var(--color-text-muted)]">
                    {cfg?.trialEndDate
                      ? new Date(cfg.trialEndDate).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : "-"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[var(--color-text-faint)]">Subscription ends</dt>
                  <dd className="mt-0.5 tabular-nums text-[var(--color-text-muted)]">
                    {cfg?.subscriptionEndDate
                      ? new Date(cfg.subscriptionEndDate).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : "-"}
                  </dd>
                </div>
              </dl>

              <Button intent="utility" className="mt-4 w-full min-[520px]:w-auto">
                Manage
              </Button>
            </article>
          );
        })}
      </div>

      <div className="scrollbar-calm hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)]">
              {["Company", "Plan", "Status", "Site flags", "Trial ends", "Sub. ends", ""].map(
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
            {items.map((co) => {
              const cfg = co.config;
              const statusCfg = cfg ? STATUS_CONFIG[cfg.subscriptionStatus] : null;
              return (
                <tr
                  key={co.publicId}
                  className="border-b border-[var(--color-border)] transition-colors last:border-b-0 hover:bg-[var(--color-surface-2)]"
                >
                  {/* Company */}
                  <td className="px-4 py-3">
                    <p className="text-[13.5px] font-medium text-[var(--color-text)]">{co.name}</p>
                    <code className="text-[11px] text-[var(--color-text-muted)]">
                      {co.companyCode}
                    </code>
                  </td>

                  {/* Plan */}
                  <td className="px-4 py-3 text-[13.5px] text-[var(--color-text)]">
                    {cfg?.planName ?? <span className="text-[var(--color-text-faint)]">–</span>}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    {statusCfg ? (
                      <Badge variant={statusCfg.variant}>
                        <span className="me-1 inline-flex">{statusCfg.icon}</span>
                        {statusCfg.label}
                      </Badge>
                    ) : (
                      <Badge variant="default">–</Badge>
                    )}
                  </td>

                  {/* Site flags - all clear in dummy data */}
                  <td className="px-4 py-3">
                    {cfg?.subscriptionStatus === "FROZEN" ? (
                      <SiteFlags flags={{ isFrozen: true }} />
                    ) : (
                      <SiteFlags flags={{}} />
                    )}
                  </td>

                  {/* Trial ends */}
                  <td className="px-4 py-3 text-[12.5px] tabular-nums text-[var(--color-text-muted)]">
                    {cfg?.trialEndDate ? (
                      new Date(cfg.trialEndDate).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })
                    ) : (
                      <span className="text-[var(--color-text-faint)]">–</span>
                    )}
                  </td>

                  {/* Sub. ends */}
                  <td className="px-4 py-3 text-[12.5px] tabular-nums text-[var(--color-text-muted)]">
                    {cfg?.subscriptionEndDate ? (
                      new Date(cfg.subscriptionEndDate).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })
                    ) : (
                      <span className="text-[var(--color-text-faint)]">–</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 text-end">
                    <Button intent="utility">Manage</Button>
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

// ─── Summary KPIs ──────────────────────────────────────────────────────────────

function SubscriptionKpis({ items }: { items: typeof dummyCompaniesWithConfig }) {
  const counts = items.reduce<Record<SubscriptionStatus, number>>(
    (acc, co) => {
      if (co.config)
        acc[co.config.subscriptionStatus] = (acc[co.config.subscriptionStatus] ?? 0) + 1;
      return acc;
    },
    {} as Record<SubscriptionStatus, number>,
  );

  return (
    <div className="mb-5 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:grid-cols-5">
      {ALL_STATUSES.map((s) => {
        const cfg = STATUS_CONFIG[s];
        return (
          <div
            key={s}
            className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3"
          >
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              {cfg.label}
            </p>
            <p className="mt-1 text-[22px] font-bold tabular-nums text-[var(--color-text)]">
              {counts[s] ?? 0}
            </p>
          </div>
        );
      })}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export function AdminSubscriptionsPage() {
  const { page, pageSize, q, status } = useSearch({ from: "/admin/subscriptions/" });
  const navigate = useNavigate({ from: "/admin/subscriptions/" });
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

  function setStatusFilter(nextStatus: SubscriptionStatus | "") {
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

  const filtered = dummyCompaniesWithConfig.filter((co) => {
    if (statusFilter && co.config?.subscriptionStatus !== statusFilter) return false;
    if (query) {
      const loweredQuery = query.toLowerCase();
      return (
        co.name.toLowerCase().includes(loweredQuery) ||
        co.companyCode.toLowerCase().includes(loweredQuery) ||
        co.config?.planName?.toLowerCase().includes(loweredQuery)
      );
    }
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="mx-auto max-w-[1480px]">
      {/* Page header */}
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-[var(--color-text)]">
            Subscriptions
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Manage company subscription statuses and site access flags
          </p>
        </div>
      </div>

      {/* KPIs */}
      <SubscriptionKpis items={dummyCompaniesWithConfig} />

      {/* Filter bar */}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        {/* Status filter chips */}
        <Button
          variant="ghost"
          size="sm"
          pressed={statusFilter === ""}
          onClick={() => setStatusFilter("")}
        >
          All
        </Button>
        {ALL_STATUSES.map((s) => (
          <Button
            key={s}
            variant="ghost"
            size="sm"
            pressed={statusFilter === s}
            onClick={() => setStatusFilter(s)}
          >
            {STATUS_CONFIG[s].label}
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
            placeholder="Search company or plan…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="ps-8"
          />
        </div>
      </div>

      {/* Table card */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <SubscriptionsTable items={visible} />
        </CardContent>
        <div className="flex flex-col gap-3 border-t border-[var(--color-border)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs text-[var(--color-text-muted)]">
            {filtered.length} of {dummyCompaniesWithConfig.length} companies
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
