import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { LeadRegistryForm } from "@/features/platform-lead-registry";
import { platformLeadOperations as operations, usePlatformAccess } from "@/shared/api";
import { RouteAccessRefusal } from "@/shared/auth";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { DataTable } from "@/shared/ui/data-table";
import { Dialog, DialogDescription, DialogTitle, useDialogIds } from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { PageHeader } from "@/shared/ui/page-header";
import { QueryPanel } from "@/shared/ui/query-panel";
import { leadRegistryQuery } from "../api/registry";
import type { LeadsSearch } from "../model/page-search";
import { LeadFilters } from "./lead-filters";

interface Props {
  search: LeadsSearch;
}
const leadLink = (publicId: string, label: string) => (
  <Link
    to="/platform/leads/$publicId"
    params={{ publicId }}
    search={{ activityPage: 1 }}
    className="font-semibold text-[var(--color-primary)] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
  >
    <bdi>{label}</bdi>
  </Link>
);
export function PlatformLeadsPage({ search }: Props) {
  const { t } = useTranslation("platform-leads");
  const access = usePlatformAccess();
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
  const create = access.availability(operations.create.key);
  return (
    <div className="mx-auto min-w-0 [overflow-wrap:anywhere] max-w-6xl space-y-6">
      <PageHeader
        title={t("leads.title")}
        description={t("leads.description")}
        action={
          create.state !== "hidden" && (
            <Button
              intent="cta"
              disabled={create.state !== "enabled" || !!error}
              onClick={() => setCreating(true)}
            >
              {t("create")}
            </Button>
          )
        }
      />
      <Input
        type="search"
        aria-label={t("search")}
        value={search.q ?? ""}
        onChange={(event) => change({ q: event.target.value || undefined, page: 1 })}
      />
      <LeadFilters search={search} change={change} />
      <QueryPanel
        title={t("leads.title")}
        pending={isPending}
        error={error}
        retry={() => void refetch()}
      >
        {data &&
          (data.leads.length ? (
            <DataTable
              items={data.leads}
              getRowKey={(lead) => lead.publicId}
              minWidth="850px"
              columns={[
                {
                  id: "company",
                  header: t("field.companyName"),
                  cell: (lead) => leadLink(lead.publicId, lead.companyName ?? t("unnamed")),
                },
                {
                  id: "contact",
                  header: t("contact.title"),
                  cell: (lead) => {
                    const primary = lead.contacts.find((contact) => contact.isPrimary);
                    return primary ? (
                      <span dir="auto">{primary.name ?? primary.email}</span>
                    ) : (
                      t("notProvided")
                    );
                  },
                },
                {
                  id: "status",
                  header: t("field.status"),
                  cell: (lead) => (
                    <Badge
                      variant={lead.isConverted ? "success" : lead.isArchived ? "default" : "info"}
                    >
                      {t(`enum.${lead.status}`)}
                    </Badge>
                  ),
                },
                {
                  id: "source",
                  header: t("field.source"),
                  cell: (lead) => t(`enum.${lead.source}`),
                },
                {
                  id: "country",
                  header: t("field.country"),
                  cell: (lead) => lead.country ?? t("notProvided"),
                },
                {
                  id: "attempts",
                  header: t("leads.attemptsColumn"),
                  cell: (lead) => lead.numberOfAttempts,
                },
                {
                  id: "action",
                  header: t("leads.action"),
                  cell: (lead) => leadLink(lead.publicId, t("leads.view")),
                },
              ]}
              renderMobileItem={(lead) => (
                <div className="space-y-2 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    {leadLink(lead.publicId, lead.companyName ?? t("unnamed"))}
                    <Badge
                      variant={lead.isConverted ? "success" : lead.isArchived ? "default" : "info"}
                    >
                      {t(`enum.${lead.status}`)}
                    </Badge>
                  </div>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    {t(`enum.${lead.source}`)} · {lead.country ?? t("notProvided")} ·{" "}
                    {t("attempts", { count: lead.numberOfAttempts })}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {t(lead.isArchived ? "archived" : "live")} ·{" "}
                    {t(lead.isConverted ? "converted" : "unconverted")}
                  </p>
                </div>
              )}
            />
          ) : (
            <p>{t(search.q ? "noMatches" : "empty")}</p>
          ))}
      </QueryPanel>
      <nav aria-label={t("pagination")} className="flex flex-wrap justify-between gap-3">
        <Button
          intent="action"
          disabled={search.page <= 1 || isFetching}
          onClick={() => change({ page: search.page - 1 })}
        >
          {t("previous")}
        </Button>
        <span>{t("page", { page: search.page, total: data?.meta.totalPages ?? 1 })}</span>
        <Button
          intent="action"
          disabled={!data || search.page >= data.meta.totalPages || isFetching}
          onClick={() => change({ page: search.page + 1 })}
        >
          {t("next")}
        </Button>
      </nav>
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
