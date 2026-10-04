import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { usePlatformCommand } from "@/features/platform-communications-command";
import {
  platformCommunicationsOperations as operations,
  platformCompanyOperations,
  usePlatformAccess,
} from "@/shared/api";
import { RouteAccessRefusal } from "@/shared/auth";
import { usePreferencesStore } from "@/shared/config";
import { formatInstant } from "@/shared/lib/format-instant";
import { usePageNavigate, usePageSearch } from "@/shared/lib/page-navigation";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { DataTable } from "@/shared/ui/data-table";
import { Dialog, DialogDescription, DialogTitle, useDialogIds } from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { PageHeader } from "@/shared/ui/page-header";
import { QueryPanel } from "@/shared/ui/query-panel";
import { SchemaForm } from "@/shared/ui/schema-form";
import {
  companyFilterOptionsQuery,
  emailTypeFilterOptionsQuery,
} from "../api/delivery-filter-options";
import {
  changeDelivery,
  deliveriesQuery,
  deliveryQuery,
  type EmailContext,
} from "../api/email-deliveries";
import { platformDeliveriesSearchSchema } from "../model/page-search";
import { SearchableFilterSelect } from "./searchable-filter-select";

export function PlatformEmailDeliveriesPage() {
  const { t } = useTranslation("platform-email-deliveries");
  const locale = usePreferencesStore((state) => state.locale);
  const access = usePlatformAccess();
  const search = usePageSearch(platformDeliveriesSearchSchema);
  const navigate = usePageNavigate(platformDeliveriesSearchSchema);
  const { deliveryId, deliveryContext, ...query } = search;
  const { data, error, isPending, refetch } = useQuery({
    ...deliveriesQuery(access.user?.publicId ?? "", query),
    enabled: access.availability(operations.deliveries.key).state === "enabled",
    retry: false,
  });
  const companyOptions = useQuery({
    ...companyFilterOptionsQuery(access.user?.publicId ?? ""),
    enabled: access.availability(platformCompanyOperations.companies.key).state === "enabled",
    retry: false,
  });
  const emailTypeOptions = useQuery({
    ...emailTypeFilterOptionsQuery(access.user?.publicId ?? ""),
    enabled: access.availability(operations.emailTypes.key).state === "enabled",
    retry: false,
  });
  if (!access.user) return null;
  if (access.availability(operations.deliveries.key).state === "hidden")
    throw new RouteAccessRefusal("platform");
  return (
    <div className="mx-auto min-w-0 max-w-6xl space-y-6 [overflow-wrap:anywhere] [&_button]:max-w-full [&_button]:whitespace-normal [&_button]:h-auto [&_button]:min-h-9">
      <PageHeader title={t("title")} description={t("intro")} />
      <SchemaForm
        key={JSON.stringify(query)}
        schema={operations.deliveries.requestSchema.shape.query}
        label={t("filters.search")}
        invalidLabel={t("invalid")}
        fields={[
          {
            name: "context",
            label: t("filters.context.label"),
            options: [
              { value: "EDARA", label: t("context.EDARA") },
              { value: "COMPANY", label: t("context.COMPANY") },
            ],
            value: query.context,
          },
          {
            name: "status",
            label: t("filters.status.label"),
            options: ["QUEUED", "PROCESSING", "RETRY_SCHEDULED", "SENT", "FAILED", "CANCELLED"].map(
              (value) => ({ value, label: t(`status.${value}`) }),
            ),
            value: query.status,
          },
          {
            name: "companyPublicId",
            label: t("filters.company.label"),
            value: query.companyPublicId,
            control:
              access.availability(platformCompanyOperations.companies.key).state === "enabled" &&
              !companyOptions.isError ? (
                <SearchableFilterSelect
                  id="delivery-filter-company"
                  name="companyPublicId"
                  label={t("filters.company.label")}
                  initialValue={query.companyPublicId ?? ""}
                  placeholder={t("filters.company.placeholder")}
                  options={companyOptions.data}
                  loading={companyOptions.isPending}
                  error={companyOptions.isError}
                  loadingLabel={t("filters.optionsLoading")}
                  errorLabel={t("filters.optionsError")}
                  emptyLabel={t("filters.optionsEmpty")}
                  clearLabel={t("filters.company.clear")}
                />
              ) : undefined,
          },
          {
            name: "emailTypeKey",
            label: t("filters.emailType.label"),
            value: query.emailTypeKey,
            control:
              access.availability(operations.emailTypes.key).state === "enabled" &&
              !emailTypeOptions.isError ? (
                <SearchableFilterSelect
                  id="delivery-filter-email-type"
                  name="emailTypeKey"
                  label={t("filters.emailType.label")}
                  initialValue={query.emailTypeKey ?? ""}
                  placeholder={t("filters.emailType.placeholder")}
                  options={emailTypeOptions.data}
                  loading={emailTypeOptions.isPending}
                  error={emailTypeOptions.isError}
                  loadingLabel={t("filters.optionsLoading")}
                  errorLabel={t("filters.optionsError")}
                  emptyLabel={t("filters.optionsEmpty")}
                  clearLabel={t("filters.emailType.clear")}
                />
              ) : undefined,
          },
          ...(["businessReference", "recipientEmail", "createdFrom", "createdTo"] as const).map(
            (name) => ({ name, label: t(`filter.${name}`), value: query[name] }),
          ),
        ]}
        onSubmit={(body) => {
          const next = operations.deliveries.requestSchema.shape.query.parse(body);
          void navigate({ search: { ...next, page: 1 } });
        }}
      />
      <QueryPanel title={t("title")} pending={isPending} error={error} retry={() => void refetch()}>
        {!data?.items.length && <p>{t("empty.title")}</p>}
        {data && data.items.length > 0 && (
          <DataTable
            items={data.items}
            getRowKey={(item) => `${item.context}:${item.publicId}`}
            minWidth="940px"
            columns={[
              {
                id: "recipient",
                header: t("table.recipient"),
                cell: (item) => <bdi dir="ltr">{item.maskedRecipient}</bdi>,
              },
              {
                id: "type",
                header: t("table.emailType"),
                cell: (item) => <bdi>{item.emailTypeKey}</bdi>,
              },
              {
                id: "context",
                header: t("table.context"),
                cell: (item) => t(`context.${item.context}`),
              },
              {
                id: "status",
                header: t("table.status"),
                cell: (item) => (
                  <Badge variant={item.status === "FAILED" ? "danger" : "default"}>
                    {t(`status.${item.status}`)}
                  </Badge>
                ),
              },
              {
                id: "attempts",
                header: t("table.attempts"),
                align: "end",
                cell: (item) => <span className="tabular-nums">{item.attempts}</span>,
              },
              {
                id: "created",
                header: t("table.created"),
                cell: (item) => formatInstant(item.createdAt, locale),
              },
              {
                id: "action",
                header: t("table.details"),
                cell: (item) =>
                  access.availability(operations.delivery.key).state === "enabled" && (
                    <Button
                      intent="action"
                      onClick={() =>
                        void navigate({
                          search: {
                            ...search,
                            deliveryId: item.publicId,
                            deliveryContext: item.context,
                          },
                        })
                      }
                    >
                      {t("table.details")}
                    </Button>
                  ),
              },
            ]}
            renderMobileItem={(item) => (
              <div className="space-y-2 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <bdi dir="ltr" className="font-medium">
                    {item.maskedRecipient}
                  </bdi>
                  <Badge variant={item.status === "FAILED" ? "danger" : "default"}>
                    {t(`status.${item.status}`)}
                  </Badge>
                </div>
                <p className="text-xs text-[var(--color-text-muted)]">
                  <bdi>{item.emailTypeKey}</bdi> · {t(`context.${item.context}`)} ·{" "}
                  {formatInstant(item.createdAt, locale)}
                </p>
                {access.availability(operations.delivery.key).state === "enabled" && (
                  <Button
                    intent="action"
                    onClick={() =>
                      void navigate({
                        search: {
                          ...search,
                          deliveryId: item.publicId,
                          deliveryContext: item.context,
                        },
                      })
                    }
                  >
                    {t("table.details")}
                  </Button>
                )}
              </div>
            )}
          />
        )}
        <div className="mt-4 flex gap-3">
          <Button
            disabled={(query.page ?? 1) <= 1}
            onClick={() => void navigate({ search: { ...query, page: (query.page ?? 1) - 1 } })}
          >
            {t("pagination.previous")}
          </Button>
          <Button
            disabled={!data || (query.page ?? 1) >= data.meta.totalPages}
            onClick={() => void navigate({ search: { ...query, page: (query.page ?? 1) + 1 } })}
          >
            {t("pagination.next")}
          </Button>
        </div>
      </QueryPanel>
      {deliveryId && deliveryContext && (
        <DeliveryDetail
          key={`${deliveryContext}:${deliveryId}`}
          context={deliveryContext}
          publicId={deliveryId}
          close={() => void navigate({ search: query })}
        />
      )}
    </div>
  );
}
interface DetailProps {
  context: EmailContext;
  publicId: string;
  close: () => void;
}
function DeliveryDetail({ context, publicId, close }: DetailProps) {
  const { t } = useTranslation("platform-email-deliveries");
  const access = usePlatformAccess();
  const ids = useDialogIds();
  const command = usePlatformCommand();
  const [action, setAction] = useState<"retry" | "cancel">();
  const [reason, setReason] = useState("");
  const { data, error, isPending, refetch } = useQuery({
    ...deliveryQuery(access.user?.publicId ?? "", context, publicId),
    enabled: access.availability(operations.delivery.key).state === "enabled",
    retry: false,
  });
  return (
    <>
      <Dialog
        open
        onClose={close}
        dismissible={!command.pending}
        titleId={ids.titleId}
        descriptionId={ids.descriptionId}
        className="max-w-2xl"
      >
        <DialogTitle id={ids.titleId}>{t("detail.title")}</DialogTitle>
        <DialogDescription id={ids.descriptionId}>{t("detail.description")}</DialogDescription>
        <QueryPanel
          title={t("detail.status")}
          pending={isPending}
          error={error}
          retry={() => void refetch()}
        >
          {data && (
            <div className="space-y-3 [overflow-wrap:anywhere]">
              <p>{data.maskedRecipient}</p>
              <Badge>{t(`status.${data.status}`)}</Badge>
              <p>{t(`context.${data.context}`)}</p>
              <dl className="grid gap-2 sm:grid-cols-2">
                {(
                  [
                    "emailTypeKey",
                    "templateRevisionKey",
                    "locale",
                    "timeZone",
                    "attempts",
                    "createdAt",
                    "sentAt",
                  ] as const
                ).map((key) => (
                  <div key={key}>
                    <dt>{t(`safe.${key}`)}</dt>
                    <dd>{data[key] ?? "—"}</dd>
                  </div>
                ))}
              </dl>
              {data.company && <p>{data.company.name}</p>}
              <h3>{t("timeline.title")}</h3>
              <ul>
                {data.timeline?.map((event, index) => (
                  <li key={`${event.occurredAt}:${index}`}>
                    {t(`stage.${event.stage}`)} · {event.occurredAt} · {event.attemptNumber ?? "—"}
                  </li>
                ))}
              </ul>
              <div className="flex gap-2">
                {(["retry", "cancel"] as const).map((next) => {
                  const operation =
                    next === "retry" ? operations.retryDelivery : operations.cancelDelivery;
                  const availability = access.availability(operation.key);
                  return (
                    availability.state !== "hidden" && (
                      <Button
                        key={next}
                        disabled={
                          availability.state !== "enabled" ||
                          command.pending ||
                          command.blocked ||
                          (next === "retry"
                            ? data.status !== "FAILED"
                            : data.status !== "QUEUED" && data.status !== "RETRY_SCHEDULED")
                        }
                        onClick={() => setAction(next)}
                      >
                        {t(`actions.${next}`)}
                      </Button>
                    )
                  );
                })}
              </div>
              {command.outcome && <p role="status">{t(`result.${command.outcome.kind}`)}</p>}
              {command.blocked && command.outcome?.kind !== "contract" && (
                <Button onClick={() => void command.reconcile()} disabled={command.pending}>
                  {t("reconcile")}
                </Button>
              )}
            </div>
          )}
        </QueryPanel>
      </Dialog>
      <ConfirmDialog
        open={!!action}
        title={t(`actions.${action ?? "retry"}`)}
        description={`${t(`context.${context}`)} · ${data?.maskedRecipient ?? ""} · ${data ? t(`status.${data.status}`) : ""}`}
        confirmLabel={t(`actions.${action ?? "retry"}`)}
        cancelLabel={t("actions.back")}
        isLoading={command.pending}
        confirmDisabled={
          !reason.trim() || reason.length > 500 || !data || !!error || command.blocked
        }
        onClose={() => setAction(undefined)}
        onConfirm={() => {
          if (!action || !data) return;
          const next = action;
          void command.run(
            (next === "retry" ? operations.retryDelivery : operations.cancelDelivery).key,
            (check) => changeDelivery(next, data, reason.trim(), check),
            () => setAction(undefined),
          );
        }}
      >
        <label>
          {t("actions.reasonLabel")}
          <Input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={500}
            disabled={command.pending}
          />
        </label>
      </ConfirmDialog>
    </>
  );
}
