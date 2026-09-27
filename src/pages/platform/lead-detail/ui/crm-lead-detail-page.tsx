import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { LeadRegistryForm } from "@/features/platform-lead-registry";
import {
  OperationRefusal,
  platformLeadOperations as operations,
  usePlatformAccess,
} from "@/shared/api";
import { RouteAccessRefusal } from "@/shared/auth";
import { Button } from "@/shared/ui/button";
import { PageHeader } from "@/shared/ui/page-header";
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
export function PlatformLeadDetailPage({ publicId, activityPage }: Props) {
  const { t } = useTranslation("platform-leads");
  const access = usePlatformAccess();
  const commands = useLeadCommands(publicId);
  const [editing, setEditing] = useState(false);
  const [converting, setConverting] = useState(false);
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
  return (
    <div className="mx-auto min-w-0 [overflow-wrap:anywhere] max-w-6xl space-y-6">
      <Link
        to="/platform/leads"
        search={{ page: 1, pageSize: 10, isArchived: false }}
        className="underline"
      >
        {t("back")}
      </Link>
      <PageHeader title={name} description={t("detail.description")} />
      {commands.feedback && <p role={commands.failed ? "alert" : "status"}>{commands.feedback}</p>}
      {commands.failed && (
        <Button intent="action" disabled={commands.busy} onClick={() => void commands.reconcile()}>
          {t("reconcile")}
        </Button>
      )}
      <QueryPanel
        title={t("registry.title")}
        pending={isPending}
        error={error}
        retry={() => void refetch()}
      >
        {data && (
          <>
            <LeadSummary lead={data.lead} />
            <LeadRegistryForm
              key={data.lead.updatedAt}
              lead={data.lead}
              disabled={restricted}
              onPendingChange={setEditing}
            />
            <LeadHistory lead={data.lead} />
            <div className="flex flex-wrap gap-3">
              {[archive, "remove"].map((kind) => {
                const action = kind === "remove" ? "remove" : archive;
                const available = access.availability(operations[action].key);
                return (
                  available.state !== "hidden" && (
                    <Button
                      key={action}
                      intent={action === "remove" ? "destructive-trigger" : "action"}
                      disabled={restricted || available.state !== "enabled"}
                      onClick={() => commands.request({ kind: action, name })}
                    >
                      {t(`action.${action}`)}
                    </Button>
                  )
                );
              })}
            </div>
          </>
        )}
      </QueryPanel>
      {data && !error && (
        <>
          <ContactPanel detail={data} restricted={restricted} commands={commands} />
          <ActivityPanel
            publicId={publicId}
            page={activityPage}
            queries={queries}
            restricted={restricted}
            commands={commands}
          />
          <DomainPanel
            publicId={publicId}
            name={name}
            queries={queries}
            restricted={restricted}
            commands={commands}
          />
          <LeadConversion
            publicId={publicId}
            name={name}
            queries={queries}
            blocked={blocked}
            onPendingChange={setConverting}
          />
        </>
      )}
      <LeadCommandDialog commands={commands} />
    </div>
  );
}
