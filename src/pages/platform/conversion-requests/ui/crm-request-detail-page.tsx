import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { ConversionPlanForm, ConversionSetupForm } from "@/features/platform-conversion-setup";
import {
  OperationRefusal,
  platformLeadOperations as operations,
  usePlatformAccess,
} from "@/shared/api";
import { RouteAccessRefusal } from "@/shared/auth";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { PageHeader } from "@/shared/ui/page-header";
import { type PageTabItem, PageTabs } from "@/shared/ui/page-tabs";
import { QueryPanel } from "@/shared/ui/query-panel";
import { SchemaForm } from "@/shared/ui/schema-form";
import { canApprove, requestDetailQuery } from "../api/review";
import { useReviewCommands } from "../model/use-review-commands";
import { DeliveryPanel } from "./delivery-panel";

interface Props {
  publicId: string;
}
type ReviewSection = "details" | "correct" | "actions";

export function PlatformConversionRequestDetailPage({ publicId }: Props) {
  const { t } = useTranslation("platform-leads");
  const access = usePlatformAccess();
  const commands = useReviewCommands(publicId);
  const tabsId = useId();
  const [section, setSection] = useState<ReviewSection>("details");
  const { data, error, isPending, isFetching, refetch } = useQuery({
    ...requestDetailQuery(access.user?.publicId ?? "", publicId),
    enabled: access.availability(operations.request.key).state === "enabled",
  });
  if (!access.user) return null;
  if (access.availability(operations.request.key).state === "hidden")
    throw new RouteAccessRefusal("platform");
  if (error instanceof OperationRefusal && [403, 404].includes(error.status)) throw error;
  const request = data;
  const name = request?.lead.companyName ?? t("unnamed");
  const disabled = commands.busy || commands.failed || isFetching || !!error;
  const available = (kind: "approve" | "reject" | "changePlan") =>
    access.availability(operations[kind].key);
  const tabs: PageTabItem<ReviewSection>[] = [
    { value: "details", label: t("requests.tab.details") },
  ];
  if (request?.status === "PENDING") {
    if (available("changePlan").state !== "hidden")
      tabs.push({ value: "correct", label: t("requests.tab.correct") });
    if (available("approve").state !== "hidden" || available("reject").state !== "hidden")
      tabs.push({ value: "actions", label: t("requests.tab.actions") });
  }
  const activeSection = tabs.some(({ value }) => value === section) ? section : "details";
  const approvalReady = request && canApprove(request);
  return (
    <div className="mx-auto min-w-0 [overflow-wrap:anywhere] max-w-5xl space-y-6">
      <Link
        to="/platform/conversion-requests"
        search={{ page: 1, pageSize: 10, status: "PENDING" }}
        className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
      >
        <ArrowLeft aria-hidden="true" className="size-4 rtl:rotate-180" />
        {t("requests.back")}
      </Link>
      <PageHeader title={name} description={t("requests.description")} />
      {commands.feedback && <p role={commands.failed ? "alert" : "status"}>{commands.feedback}</p>}
      {commands.failed && (
        <Button intent="action" onClick={() => void commands.reconcile()}>
          {t("reconcile")}
        </Button>
      )}
      {tabs.length > 1 && (
        <PageTabs
          id={tabsId}
          items={tabs}
          value={activeSection}
          onValueChange={setSection}
          ariaLabel={t("requests.sections")}
        />
      )}
      <div
        role={tabs.length > 1 ? "tabpanel" : undefined}
        id={`${tabsId}-panel-details`}
        aria-labelledby={tabs.length > 1 ? `${tabsId}-tab-details` : undefined}
        hidden={activeSection !== "details" && !error}
        className="space-y-4"
      >
        <QueryPanel
          title={t("requests.title")}
          pending={isPending}
          error={error}
          retry={() => void refetch()}
        >
          {request && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant={
                    request.status === "APPROVED"
                      ? "success"
                      : request.status === "REJECTED"
                        ? "danger"
                        : "warning"
                  }
                >
                  {t(`enum.${request.status}`)}
                </Badge>
                <span className="font-medium">{request.plan.name}</span>
                <Badge>{t(request.plan.isActive ? "plan.active" : "plan.inactive")}</Badge>
              </div>
              <dl className="grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-sm text-[var(--color-text-muted)]">{t("requests.owner")}</dt>
                  <dd>{request.primaryContact?.name ?? t("withheld")}</dd>
                  <dd dir="ltr">{request.primaryContact?.email ?? t("withheld")}</dd>
                </div>
                <div>
                  <dt className="text-sm text-[var(--color-text-muted)]">
                    {t("requests.requester")}
                  </dt>
                  <dd>
                    {request.requester
                      ? `${request.requester.firstName} ${request.requester.lastName}`
                      : t("withheld")}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-[var(--color-text-muted)]">
                    {t("requests.company")}
                  </dt>
                  <dd>{request.company?.name ?? t("notProvided")}</dd>
                </div>
              </dl>
              {request.status === "REJECTED" && (
                <p className="whitespace-pre-wrap break-words">
                  {request.rejectionReason ?? t("withheld")}
                </p>
              )}
              {access.availability(operations.lead.key).state === "enabled" && (
                <Link
                  to="/platform/leads/$publicId"
                  params={{ publicId: request.lead.publicId }}
                  search={{ activityPage: 1 }}
                  className="underline"
                >
                  {t("requests.lead")}
                </Link>
              )}
            </>
          )}
        </QueryPanel>
        {request && !error && request.status !== "PENDING" && <p>{t("requests.terminal")}</p>}
        {request?.status === "APPROVED" && !error && (
          <DeliveryPanel request={request} disabled={disabled} commands={commands} />
        )}
      </div>
      {request?.status === "PENDING" && !error && (
        <>
          <div
            role="tabpanel"
            id={`${tabsId}-panel-correct`}
            aria-labelledby={`${tabsId}-tab-correct`}
            hidden={activeSection !== "correct"}
          >
            {available("changePlan").state !== "hidden" && (
              <ConversionPlanForm
                disabled={disabled || available("changePlan").state !== "enabled"}
                label={t("action.changePlan")}
                onSubmit={(body) => commands.request({ kind: "changePlan", body })}
              />
            )}
          </div>
          <div
            role="tabpanel"
            id={`${tabsId}-panel-actions`}
            aria-labelledby={`${tabsId}-tab-actions`}
            hidden={activeSection !== "actions"}
            className="space-y-4"
          >
            {available("approve").state !== "hidden" && (
              <>
                <ConversionSetupForm
                  disabled={disabled || available("approve").state !== "enabled" || !approvalReady}
                  label={t("action.approve")}
                  onSubmit={(body) => commands.request({ kind: "approve", body })}
                />
                {!approvalReady && (
                  <p className="text-sm text-[var(--color-text-muted)]">
                    {t("requests.prerequisites")}
                  </p>
                )}
              </>
            )}
            {available("reject").state !== "hidden" && (
              <QueryPanel title={t("action.reject")}>
                <SchemaForm
                  schema={operations.reject.requestSchema.shape.body}
                  fields={[
                    {
                      name: "reason",
                      label: t("requests.reason"),
                      type: "textarea",
                      required: true,
                    },
                  ]}
                  label={t("action.reject")}
                  invalidLabel={t("invalid")}
                  disabled={disabled || available("reject").state !== "enabled"}
                  onSubmit={(body) => commands.request({ kind: "reject", body })}
                />
              </QueryPanel>
            )}
          </div>
        </>
      )}
      {commands.pending && (
        <ConfirmDialog
          open
          title={t("confirm.title", { action: t(`action.${commands.pending.kind}`), name })}
          description={t(`confirm.${commands.pending.kind}`, { name })}
          confirmLabel={t(`action.${commands.pending.kind}`)}
          cancelLabel={t("cancel")}
          tone="consequential"
          isLoading={commands.busy}
          onClose={commands.cancel}
          onConfirm={commands.confirm}
        />
      )}
    </div>
  );
}
