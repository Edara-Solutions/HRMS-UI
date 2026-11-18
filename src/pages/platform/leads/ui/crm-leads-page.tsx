import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, ContactRound } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { LeadRegistryForm } from "@/features/platform-lead-registry";
import {
  ContractViolation,
  platformLeadOperations as operations,
  usePlatformAccess,
} from "@/shared/api";
import { RouteAccessRefusal } from "@/shared/auth";
import { usePreferencesStore } from "@/shared/config";
import { formatInstant } from "@/shared/lib/format-instant";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { DataTable } from "@/shared/ui/data-table";
import { Dialog, DialogDescription, DialogTitle, useDialogIds } from "@/shared/ui/dialog";
import { EmptyState } from "@/shared/ui/empty-state";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Skeleton } from "@/shared/ui/skeleton";
import { leadRegistryQuery } from "../api/registry";
import type { LeadsSearch } from "../model/page-search";
import { LeadFilters } from "./lead-filters";

const PAGE_SIZES = [10, 20, 50, 100] as const;

const linkClassName =
  "font-semibold text-[var(--color-primary)] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]";

const leadLink = (publicId: string, label: string) => (
  <Link
    to="/platform/leads/$publicId"
    params={{ publicId }}
    search={{ activityPage: 1 }}
    className={linkClassName}
  >
    <bdi>{label}</bdi>
  </Link>
);

interface Props {
  search: LeadsSearch;
}

export function PlatformLeadsPage({ search }: Props) {
  const { t } = useTranslation("platform-leads");
  const access = usePlatformAccess();
  const locale = usePreferencesStore((state) => state.locale);
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const { titleId, descriptionId } = useDialogIds();
  const { data, error, isPending, isFetching, refetch } = useQuery({
    ...leadRegistryQuery(access.user?.publicId ?? "", search),
    enabled: access.availability(operations.leads.key).state === "enabled",
  });
  if (!access.user) return null;
  if (access.availability(operations.leads.key).state === "hidden")
    throw new RouteAccessRefusal("platform");

  const change = (update: Partial<LeadsSearch>) =>
    void navigate({ to: "/platform/leads", search: { ...search, ...update } });
  const reset = () =>
    void navigate({
      to: "/platform/leads",
      search: { page: 1, pageSize: search.pageSize, isArchived: false },
    });
  const create = access.availability(operations.create.key);
  const filtered = Boolean(
    search.q ||
      search.status ||
      search.source ||
      search.country ||
      search.createdFrom ||
      search.createdTo ||
      search.isArchived,
  );
  const totalPages = Math.max(1, data?.meta.totalPages ?? 1);
  const page = Math.min(search.page, totalPages);
  const statusBadge = (lead: { status: string; isConverted: boolean; isArchived: boolean }) => (
    <Badge
      variant={lead.isConverted ? "success" : lead.isArchived ? "default" : "info"}
      className="shrink-0 whitespace-nowrap"
    >
      {t(`enum.${lead.status}`)}
    </Badge>
  );
  const primaryContact = (
    contacts: { name: string | null; email: string | null; isPrimary: boolean }[],
  ) => {
    const primary = contacts.find((contact) => contact.isPrimary);
    return primary ? <bdi>{primary.name ?? primary.email}</bdi> : t("notProvided");
  };

  return (
    <div className="mx-auto min-w-0 max-w-[1480px] space-y-4">
      <div className="mb-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-[26px] font-bold tracking-tight text-[var(--color-text)]">
            {t("leads.title")}
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">{t("leads.description")}</p>
        </div>
        {create.state !== "hidden" && (
          <Button
            intent="cta"
            className="shrink-0 self-start sm:self-auto"
            disabled={create.state !== "enabled" || !!error}
            onClick={() => setCreating(true)}
          >
            {t("create")}
          </Button>
        )}
      </div>

      <LeadFilters search={search} change={change} reset={reset} />

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {isPending && (
            <output aria-label={t("leads.loading")} className="block space-y-3 p-4">
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-11 w-full" />
            </output>
          )}
          {error && (
            <EmptyState
              role="alert"
              icon={ContactRound}
              title={t("leads.error.title")}
              description={
                error instanceof ContractViolation
                  ? t("leads.contract")
                  : t("leads.error.description")
              }
              action={
                !(error instanceof ContractViolation) && (
                  <Button variant="secondary" size="sm" onClick={() => void refetch()}>
                    {t("leads.error.action")}
                  </Button>
                )
              }
            />
          )}
          {data && data.leads.length === 0 && (
            <EmptyState
              icon={ContactRound}
              title={t(filtered ? "leads.noMatches.title" : "leads.empty.title")}
              description={t(filtered ? "leads.noMatches.description" : "leads.empty.description")}
              action={
                filtered && (
                  <Button variant="secondary" size="sm" onClick={reset}>
                    {t("requests.reset")}
                  </Button>
                )
              }
            />
          )}
          {data && data.leads.length > 0 && (
            <DataTable
              items={data.leads}
              getRowKey={(lead) => lead.publicId}
              minWidth="1040px"
              mobileBreakpoint="lg"
              columns={[
                {
                  id: "company",
                  header: t("field.companyName"),
                  cell: (lead) => leadLink(lead.publicId, lead.companyName ?? t("unnamed")),
                },
                {
                  id: "contact",
                  header: t("leads.primaryContact"),
                  cell: (lead) => primaryContact(lead.contacts),
                },
                {
                  id: "industry",
                  header: t("requests.industrySize"),
                  cell: (lead) => (
                    <>
                      <p className="text-[var(--color-text)]">
                        <bdi>{lead.industry ?? t("requests.noIndustry")}</bdi>
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--color-text-faint)]">
                        {t(`enum.${lead.size}`)}
                      </p>
                    </>
                  ),
                },
                {
                  id: "source",
                  header: t("field.source"),
                  cell: (lead) => t(`enum.${lead.source}`),
                },
                { id: "status", header: t("field.status"), cell: (lead) => statusBadge(lead) },
                {
                  id: "attempts",
                  header: t("leads.attemptsColumn"),
                  align: "center",
                  className: "tabular-nums text-[var(--color-text-muted)]",
                  cell: (lead) => lead.numberOfAttempts,
                },
                {
                  id: "updated",
                  header: t("leads.updated"),
                  className: "tabular-nums text-xs text-[var(--color-text-muted)]",
                  cell: (lead) => formatInstant(lead.updatedAt, locale),
                },
                {
                  id: "action",
                  header: <span className="sr-only">{t("leads.action")}</span>,
                  align: "end",
                  cell: (lead) => leadLink(lead.publicId, t("leads.view")),
                },
              ]}
              renderMobileItem={(lead) => (
                <div className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      {leadLink(lead.publicId, lead.companyName ?? t("unnamed"))}
                    </div>
                    {statusBadge(lead)}
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {primaryContact(lead.contacts)} · {t(`enum.${lead.source}`)}
                  </p>
                  <p className="text-xs text-[var(--color-text-faint)]">
                    {t("attempts", { count: lead.numberOfAttempts })} ·{" "}
                    {formatInstant(lead.updatedAt, locale)}
                  </p>
                </div>
              )}
            />
          )}
        </CardContent>
        {data && (
          <div className="flex flex-col gap-3 border-t border-[var(--color-border)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs tabular-nums text-[var(--color-text-muted)]">
                {t("leads.count", { shown: data.leads.length, total: data.meta.totalItems })}
              </span>
              <div className="w-20">
                <Select
                  value={String(search.pageSize)}
                  onValueChange={(value) => change({ pageSize: Number(value), page: 1 })}
                >
                  <SelectTrigger aria-label={t("pageSize")} className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZES.map((size) => (
                      <SelectItem key={size} value={String(size)}>
                        {String(size)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <nav aria-label={t("pagination")} className="flex items-center gap-1.5">
              <Button
                variant="nav"
                size="iconXs"
                className="btn-nav-prev"
                aria-label={t("previous")}
                title={t("previous")}
                disabled={isFetching || page <= 1}
                onClick={() => change({ page: page - 1 })}
              >
                <ChevronLeft size={14} className="rtl:-scale-x-100" />
              </Button>
              <span className="select-none px-2 text-[12px] tabular-nums text-[var(--color-text-muted)]">
                {t("leads.pageOf", { current: page, total: totalPages })}
              </span>
              <Button
                variant="nav"
                size="iconXs"
                className="btn-nav-next"
                aria-label={t("next")}
                title={t("next")}
                disabled={isFetching || page >= totalPages}
                onClick={() => change({ page: page + 1 })}
              >
                <ChevronRight size={14} className="rtl:-scale-x-100" />
              </Button>
            </nav>
          </div>
        )}
      </Card>

      {creating && (
        <Dialog
          open
          onClose={() => {
            if (!saving) setCreating(false);
          }}
          titleId={titleId}
          descriptionId={descriptionId}
          className="max-h-[90vh] max-w-2xl overflow-y-auto"
        >
          <DialogTitle id={titleId}>{t("create")}</DialogTitle>
          <DialogDescription id={descriptionId}>{t("createHelp")}</DialogDescription>
          <LeadRegistryForm
            onCancel={() => setCreating(false)}
            onPendingChange={setSaving}
            onSaved={async (publicId) => {
              setCreating(false);
              await navigate({
                to: "/platform/leads/$publicId",
                params: { publicId },
                search: { activityPage: 1 },
              });
            }}
          />
        </Dialog>
      )}
    </div>
  );
}
