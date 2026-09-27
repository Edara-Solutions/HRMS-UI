import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ConversionPlanForm, ConversionSetupForm } from "@/features/platform-conversion-setup";
import {
  OperationRefusal,
  platformLeadOperations as operations,
  usePlatformAccess,
} from "@/shared/api";
import { RouteAccessRefusal } from "@/shared/auth";
import { Button } from "@/shared/ui/button";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { PageHeader } from "@/shared/ui/page-header";
import { QueryPanel } from "@/shared/ui/query-panel";
import { SchemaForm } from "@/shared/ui/schema-form";
import { canApprove, requestDetailQuery } from "../api/review";
import { useReviewCommands } from "../model/use-review-commands";
import { DeliveryPanel } from "./delivery-panel";

interface Props {
  publicId: string;
}
export function PlatformConversionRequestDetailPage({ publicId }: Props) {
  const { t } = useTranslation("platform-leads");
  const access = usePlatformAccess();
  const commands = useReviewCommands(publicId);
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
  return (
    <div className="mx-auto min-w-0 [overflow-wrap:anywhere] max-w-5xl space-y-6">
      <Link
        to="/platform/conversion-requests"
        search={{ page: 1, pageSize: 10, status: "PENDING" }}
        className="underline"
      >
        {t("requests.back")}
      </Link>
      <PageHeader title={name} description={t("requests.description")} />
      {commands.feedback && <p role={commands.failed ? "alert" : "status"}>{commands.feedback}</p>}
      {commands.failed && (
        <Button intent="action" onClick={() => void commands.reconcile()}>
          {t("reconcile")}
        </Button>
      )}
      <QueryPanel
        title={t("requests.title")}
        pending={isPending}
        error={error}
        retry={() => void refetch()}
      >
        {request && (
          <>
            <p>
              {t(`enum.${request.status}`)} · {request.plan.name} ·{" "}
              {t(request.plan.isActive ? "plan.active" : "plan.inactive")}
            </p>
            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt>{t("requests.owner")}</dt>
                <dd>{request.primaryContact?.name ?? t("withheld")}</dd>
                <dd dir="ltr">{request.primaryContact?.email ?? t("withheld")}</dd>
              </div>
              <div>
                <dt>{t("requests.requester")}</dt>
                <dd>
                  {request.requester
                    ? `${request.requester.firstName} ${request.requester.lastName}`
                    : t("withheld")}
                </dd>
              </div>
              <div>
                <dt>{t("requests.company")}</dt>
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
      {request && !error && (
        <>
          {request.status === "PENDING" ? (
            <>
              {available("changePlan").state !== "hidden" && (
                <ConversionPlanForm
                  disabled={disabled || available("changePlan").state !== "enabled"}
                  label={t("action.changePlan")}
                  onSubmit={(body) => commands.request({ kind: "changePlan", body })}
                />
              )}
              {available("approve").state !== "hidden" && (
                <>
                  <ConversionSetupForm
                    disabled={
                      disabled || available("approve").state !== "enabled" || !canApprove(request)
                    }
                    label={t("action.approve")}
                    onSubmit={(body) => commands.request({ kind: "approve", body })}
                  />
                  {!canApprove(request) && <p>{t("requests.prerequisites")}</p>}
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
            </>
          ) : (
            <p>{t("requests.terminal")}</p>
          )}
          {request.status === "APPROVED" && (
            <DeliveryPanel request={request} disabled={disabled} commands={commands} />
          )}
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
