import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Archive, ArchiveRestore, ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { LeadRegistryForm } from "@/features/platform-lead-registry";
import {
  OperationRefusal,
  platformLeadOperations as operations,
  usePlatformAccess,
} from "@/shared/api";
import { RouteAccessRefusal } from "@/shared/auth";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogTitle, useDialogIds } from "@/shared/ui/dialog";
import { PageHeader } from "@/shared/ui/page-header";
import { PageTabs } from "@/shared/ui/page-tabs";
import { QueryPanel } from "@/shared/ui/query-panel";
import { crmQueries } from "../api/crm";
import { useLeadCommands } from "../model/use-lead-commands";
import { ActivityPanel } from "./activity-panel";
import { ContactPanel } from "./contact-panel";
import { DomainPanel } from "./domain-panel";
import { LeadCommandDialog } from "./lead-command-dialog";
import { LeadConversion } from "./lead-conversion";
import { LeadHistory } from "./lead-history";
import { LeadSummary } from "./lead-summary";

interface Props {
  publicId: string;
  activityPage: number;
}
const sections = ["profile", "conversion", "domain", "activity"] as const;

export function PlatformLeadDetailPage({ publicId, activityPage }: Props) {
  const { t } = useTranslation("platform-leads");
  const access = usePlatformAccess();
  const commands = useLeadCommands(publicId, activityPage);
  const tabsId = useId();
  const [section, setSection] = useState<(typeof sections)[number]>(
    activityPage > 1 ? "activity" : "profile",
  );
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [converting, setConverting] = useState(false);
  const { titleId } = useDialogIds();
  const queries = crmQueries(access.user?.publicId ?? "", publicId, activityPage);
  const { data, error, isPending, isFetching, refetch } = useQuery({
    ...queries.lead,
    enabled: access.availability(operations.lead.key).state === "enabled",
  });
  if (!access.user) return null;
  if (access.availability(operations.lead.key).state === "hidden")
    throw new RouteAccessRefusal("platform");
  if (error instanceof OperationRefusal && [403, 404].includes(error.status)) throw error;
  const name = data?.lead.companyName ?? t("unnamed");
  const blocked =
    commands.busy || commands.failed || editing || converting || isFetching || !!error;
  const restricted = blocked || !data || data.lead.isConverted;
  const archive = data?.lead.isArchived ? "unarchive" : "archive";
  const update = access.availability(operations.update.key);
  const archiveAccess = access.availability(operations[archive].key);
  const remove = access.availability(operations.remove.key);
  const showConversion = access.availability(operations.eligibility.key).state === "enabled";
  const showDomain = access.availability(operations.domain.key).state === "enabled";
  const tabs = sections.filter((value) =>
    value === "domain" ? showDomain : value === "conversion" ? showConversion : true,
  );
  const activeSection = tabs.includes(section) ? section : "profile";
  const ArchiveIcon = archive === "archive" ? Archive : ArchiveRestore;
  return (
    <div className="mx-auto min-w-0 [overflow-wrap:anywhere] max-w-6xl space-y-6">
      <Link
        to="/platform/leads"
        search={{ page: 1, pageSize: 10, isArchived: false }}
        className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
      >
        <ArrowLeft aria-hidden="true" className="size-4 rtl:rotate-180" />
        {t("back")}
      </Link>
      <PageHeader
        title={name}
        description={t("detail.description")}
        action={
          data && (
            <div className="flex flex-wrap gap-2">
              {archiveAccess.state !== "hidden" && (
                <Button
                  intent="utility"
                  leadingIcon={<ArchiveIcon aria-hidden="true" size={14} />}
                  disabled={restricted || archiveAccess.state !== "enabled"}
                  onClick={() => commands.request({ kind: archive, name })}
                >
                  {t(`action.${archive}`)}
                </Button>
              )}
              {update.state !== "hidden" && (
                <Button
                  intent="action"
                  leadingIcon={<Pencil aria-hidden="true" size={14} />}
                  disabled={restricted || update.state !== "enabled"}
                  onClick={() => setEditOpen(true)}
                >
                  {t("detail.edit")}
                </Button>
              )}
              {remove.state !== "hidden" && (
                <Button
                  intent="destructive-trigger"
                  leadingIcon={<Trash2 aria-hidden="true" size={14} />}
                  disabled={restricted || remove.state !== "enabled"}
                  onClick={() => commands.request({ kind: "remove", name })}
                >
                  {t("action.remove")}
                </Button>
              )}
            </div>
          )
        }
      />
      {commands.feedback && <p role={commands.failed ? "alert" : "status"}>{commands.feedback}</p>}
      {commands.failed && (
        <Button intent="action" disabled={commands.busy} onClick={() => void commands.reconcile()}>
          {t("reconcile")}
        </Button>
      )}
      {data && !error ? (
        <>
          <PageTabs
            id={tabsId}
            items={tabs.map((value) => ({ value, label: t(`detail.tab.${value}`) }))}
            value={activeSection}
            onValueChange={setSection}
            ariaLabel={t("detail.sections")}
          />
          <div
            role="tabpanel"
            id={`${tabsId}-panel-profile`}
            aria-labelledby={`${tabsId}-tab-profile`}
            hidden={activeSection !== "profile"}
          >
            <div className="flex flex-wrap items-start gap-4">
              <div className="min-w-0 flex-[1_1_24rem] space-y-4">
                <QueryPanel title={t("registry.title")}>
                  <LeadSummary lead={data.lead} />
                </QueryPanel>
                <QueryPanel title={t("history.title")}>
                  <LeadHistory lead={data.lead} />
                </QueryPanel>
              </div>
              <div className="min-w-0 flex-[1_1_25rem]">
                <ContactPanel detail={data} restricted={restricted} commands={commands} />
              </div>
            </div>
          </div>
          {showConversion && (
            <div
              role="tabpanel"
              id={`${tabsId}-panel-conversion`}
              aria-labelledby={`${tabsId}-tab-conversion`}
              hidden={activeSection !== "conversion"}
            >
              <LeadConversion
                publicId={publicId}
                name={name}
                converted={data.lead.isConverted}
                queries={queries}
                blocked={blocked}
                onOpenProfile={() => {
                  setSection("profile");
                  document.getElementById(`${tabsId}-tab-profile`)?.focus();
                }}
                onPendingChange={setConverting}
              />
            </div>
          )}
          {showDomain && (
            <div
              role="tabpanel"
              id={`${tabsId}-panel-domain`}
              aria-labelledby={`${tabsId}-tab-domain`}
              hidden={activeSection !== "domain"}
            >
              <DomainPanel
                name={name}
                queries={queries}
                restricted={restricted}
                commands={commands}
              />
            </div>
          )}
          <div
            role="tabpanel"
            id={`${tabsId}-panel-activity`}
            aria-labelledby={`${tabsId}-tab-activity`}
            hidden={activeSection !== "activity"}
          >
            <ActivityPanel
              publicId={publicId}
              leadName={name}
              page={activityPage}
              queries={queries}
              restricted={restricted}
              commands={commands}
            />
          </div>
        </>
      ) : (
        <QueryPanel
          title={t("registry.title")}
          pending={isPending}
          error={error}
          retry={() => void refetch()}
        >
          {null}
        </QueryPanel>
      )}
      <Dialog
        open={editOpen && !!data && !error}
        onClose={() => setEditOpen(false)}
        dismissible={!editing}
        titleId={titleId}
        className="max-h-[90dvh] max-w-2xl overflow-y-auto"
      >
        {data && editOpen && (
          <>
            <DialogTitle id={titleId}>{t("detail.edit")}</DialogTitle>
            <div className="mt-4">
              <LeadRegistryForm
                lead={data.lead}
                disabled={restricted}
                onPendingChange={setEditing}
                onSaved={async () => setEditOpen(false)}
                onCancel={() => setEditOpen(false)}
              />
            </div>
          </>
        )}
      </Dialog>
      <LeadCommandDialog commands={commands} />
    </div>
  );
}
