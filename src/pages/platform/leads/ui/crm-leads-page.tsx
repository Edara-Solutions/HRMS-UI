import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { LeadRegistryForm } from "@/features/platform-lead-registry";
import { platformLeadOperations as operations, usePlatformAccess } from "@/shared/api";
import { RouteAccessRefusal } from "@/shared/auth";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogTitle, useDialogIds } from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { PageHeader } from "@/shared/ui/page-header";
import { QueryPanel } from "@/shared/ui/query-panel";
import { leadRegistryQuery } from "../api/registry";
import type { LeadsSearch } from "../model/page-search";
import { LeadFilters } from "./lead-filters";

interface Props {
  search: LeadsSearch;
}
export function PlatformLeadsPage({ search }: Props) {
  const { t } = useTranslation("platform-leads");
  const access = usePlatformAccess();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const { titleId } = useDialogIds();
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
            <ul className="divide-y divide-[var(--color-border)]">
              {data.leads.map((lead) => (
                <li key={lead.publicId} className="space-y-2 py-4">
                  <Link
                    to="/platform/leads/$publicId"
                    params={{ publicId: lead.publicId }}
                    search={{ activityPage: 1 }}
                    className="font-semibold underline"
                  >
                    {lead.companyName ?? t("unnamed")}
                  </Link>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    {t(`enum.${lead.status}`)} · {t(`enum.${lead.source}`)} ·{" "}
                    {lead.country ?? t("notProvided")}
                  </p>
                  <p>
                    {t(lead.isArchived ? "archived" : "live")} ·{" "}
                    {t(lead.isConverted ? "converted" : "unconverted")} ·{" "}
                    {t("attempts", { count: lead.numberOfAttempts })}
                  </p>
                </li>
              ))}
            </ul>
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
        >
          <DialogTitle id={titleId}>{t("create")}</DialogTitle>
          <LeadRegistryForm
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
