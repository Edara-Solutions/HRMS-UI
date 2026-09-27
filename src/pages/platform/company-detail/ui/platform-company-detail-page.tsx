import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { RegistryForm } from "@/features/platform-company-registry";
import {
  OperationRefusal,
  platformCompanyOperations as operations,
  usePlatformAccess,
} from "@/shared/api";
import { RouteAccessRefusal } from "@/shared/auth";
import { usePreferencesStore } from "@/shared/config";
import { formatInstant } from "@/shared/lib/format-instant";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { PageHeader } from "@/shared/ui/page-header";
import { companyQueries } from "../api/company-detail";
import { useCompanyCommands } from "../model/use-company-commands";
import { ActivationPanel } from "./activation-panel";
import { CompanyCommandDialog } from "./company-command-dialog";
import { Field } from "./field";
import { LifecycleCard } from "./lifecycle-card";
import { PolicyPanel } from "./policy-panel";
import { ReadPanel } from "./read-panel";
import { SubscriptionPanel } from "./subscription-panel";

interface Props {
  publicId: string;
}
export function PlatformCompanyDetailPage({ publicId }: Props) {
  const { t } = useTranslation("platform-companies");
  const access = usePlatformAccess();
  const locale = usePreferencesStore((state) => state.locale);
  const commands = useCompanyCommands(publicId);
  const [editing, setEditing] = useState(false);
  const queries = companyQueries(access.user?.publicId ?? "", publicId);
  const {
    data: record,
    error: companyError,
    isPending,
    isFetching,
    refetch,
  } = useQuery({
    ...queries.company,
    enabled: !commands.deleted && access.availability(operations.company.key).state === "enabled",
  });
  const commercialEnabled =
    !commands.deleted && access.availability(operations.commercial.key).state === "enabled";
  const {
    data: commercial,
    error: commercialError,
    isPending: commercialPending,
    isFetching: commercialFetching,
    refetch: refetchCommercial,
  } = useQuery({ ...queries.commercial, enabled: commercialEnabled });
  if (
    !commands.deleted &&
    companyError instanceof OperationRefusal &&
    [403, 404].includes(companyError.status)
  )
    throw companyError;
  if (!access.user) return null;
  if (access.availability(operations.company.key).state === "hidden")
    throw new RouteAccessRefusal("platform");
  const blocked =
    commands.busy ||
    commands.failed ||
    editing ||
    isFetching ||
    !!companyError ||
    commercialFetching;
  const date = (value: string | null) => (value ? formatInstant(value, locale) : t("notProvided"));
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link to="/platform/companies" search={{ page: 1 }} className="text-sm underline">
        {t("back")}
      </Link>
      <PageHeader title={record?.name ?? t("detail.title")} description={t("detail.description")} />
      {commands.feedback && <p role={commands.failed ? "alert" : "status"}>{commands.feedback}</p>}
      {commands.failed && (
        <Button intent="action" disabled={commands.busy} onClick={() => void commands.reconcile()}>
          {t("reconcile")}
        </Button>
      )}
      {commands.deleted ? (
        <Card>
          <CardContent className="space-y-4 p-4">
            <p>{t("deleted")}</p>
            {access.availability(operations.restore.key).state !== "hidden" && (
              <Button
                intent="action"
                disabled={
                  blocked || access.availability(operations.restore.key).state !== "enabled"
                }
                onClick={() => commands.request({ command: "restore" })}
              >
                {t("action.restore")}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <ReadPanel
            title={t("registry.title")}
            pending={isPending}
            error={companyError}
            retry={() => void refetch()}
          >
            {record && (
              <>
                <dl className="grid gap-4 sm:grid-cols-3">
                  <Field label={t("field.country")} value={record.country} />
                  <Field label={t("field.phoneNumber")} value={record.phoneNumber} />
                  <Field label={t("field.website")} value={record.website ?? t("notProvided")} />
                  <Field label={t("field.logo")} value={record.logo ?? t("notProvided")} />
                  <Field
                    label={t("field.addressLine")}
                    value={record.addressLine ?? t("notProvided")}
                  />
                  <Field label={t("field.companyCode")} value={record.companyCode} />
                  <Field label={t("registry.isActive")} value={t(record.isActive ? "yes" : "no")} />
                  <Field
                    label={t("lifecycle.title")}
                    value={t(`state.${record.lifecycleStatus}`)}
                  />
                  <Field label={t("activatedAt")} value={date(record.activatedAt)} />
                  <Field label={t("createdAt")} value={date(record.createdAt)} />
                  <Field label={t("updatedAt")} value={date(record.updatedAt)} />
                </dl>
                <RegistryForm
                  key={record.publicId}
                  company={record}
                  disabled={commands.busy || commands.failed}
                  onPendingChange={setEditing}
                />
              </>
            )}
          </ReadPanel>
          {record && !companyError && (
            <LifecycleCard
              company={record}
              commercial={!commercialError ? commercial : undefined}
              blocked={blocked}
              commands={commands}
            />
          )}
          <PolicyPanel queries={queries} blocked={blocked} commands={commands} />
          <ActivationPanel
            queries={queries}
            company={record}
            blocked={blocked}
            commands={commands}
          />
          {commercialEnabled && (
            <ReadPanel
              title={t("commercial.title")}
              pending={commercialPending}
              error={commercialError}
              retry={() => void refetchCommercial()}
            >
              {commercial && (
                <dl className="grid gap-4 sm:grid-cols-2">
                  <Field label={t("subscription.plan")} value={commercial.plan} />
                  <Field
                    label={t("subscription.status")}
                    value={t(`state.${commercial.subscriptionStatus}`)}
                  />
                  <Field
                    label={t("commercial.isFrozen")}
                    value={t(commercial.isFrozen ? "yes" : "no")}
                  />
                  <Field
                    label={t("commercial.isReadOnly")}
                    value={t(commercial.isReadOnly ? "yes" : "no")}
                  />
                  <Field
                    label={t("commercial.isBlocked")}
                    value={t(commercial.isBlocked ? "yes" : "no")}
                  />
                  <Field
                    label={t("commercial.isUnderMaintenance")}
                    value={t(commercial.isUnderMaintenance ? "yes" : "no")}
                  />
                  <Field
                    label={t("subscription.startDate")}
                    value={date(commercial.subscriptionStartDate)}
                  />
                  <Field
                    label={t("subscription.endDate")}
                    value={date(commercial.subscriptionEndDate)}
                  />
                  <Field
                    label={t("subscription.trialEndDate")}
                    value={date(commercial.trialEndDate)}
                  />
                </dl>
              )}
            </ReadPanel>
          )}
          <SubscriptionPanel queries={queries} blocked={blocked} commands={commands} />
        </>
      )}
      <CompanyCommandDialog name={record?.name ?? t("detail.title")} commands={commands} />
    </div>
  );
}
