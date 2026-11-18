import { useQuery } from "@tanstack/react-query";
import { CircleCheck, CircleX, Clock3, RotateCcw, ShieldAlert, X } from "lucide-react";
import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { usePlatformCommand } from "@/features/platform-communications-command";
import { platformCommunicationsOperations as operations, usePlatformAccess } from "@/shared/api";
import { usePreferencesStore } from "@/shared/config";
import { formatInstant } from "@/shared/lib/format-instant";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogDescription, DialogTitle, useDialogIds } from "@/shared/ui/dialog";
import { Label } from "@/shared/ui/label";
import { Skeleton } from "@/shared/ui/skeleton";
import { Textarea } from "@/shared/ui/textarea";
import {
  changeDelivery,
  type DeliveryRecord,
  type DeliveryStatus,
  deliveryQuery,
  type EmailContext,
} from "../api/email-deliveries";
import { failureKey, readFailure } from "../model/delivery-presentation";
import { DeliveryStatusBadge } from "./delivery-status-badge";

type DeliveryAction = "retry" | "cancel";

const canRetry = (status: DeliveryStatus) => status === "FAILED";
const canCancel = (status: DeliveryStatus) => status === "QUEUED" || status === "RETRY_SCHEDULED";

function StageIcon({ stage }: { stage: string }) {
  if (stage === "SENT")
    return <CircleCheck size={16} className="text-[var(--color-success)]" aria-hidden="true" />;
  if (stage === "FAILED")
    return <ShieldAlert size={14} className="text-[var(--color-danger)]" aria-hidden="true" />;
  if (stage === "RETRY_SCHEDULED" || stage === "RETRY_REQUESTED")
    return <RotateCcw size={14} className="text-[var(--color-warning)]" aria-hidden="true" />;
  if (stage === "CANCELLED")
    return <CircleX size={16} className="text-[var(--color-text-muted)]" aria-hidden="true" />;
  return <Clock3 size={14} className="text-[var(--color-primary)]" aria-hidden="true" />;
}

const eyebrow =
  "text-[11px] font-semibold uppercase tracking-widest text-[var(--color-text-faint)]";

function Fact({ label, children, mono }: { label: string; children: ReactNode; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className={eyebrow}>{label}</dt>
      <dd
        className={
          mono
            ? "mt-1 break-all font-mono text-xs text-[var(--color-text)]"
            : "mt-1 text-[var(--color-text)]"
        }
      >
        {children}
      </dd>
    </div>
  );
}

interface DeliveryDetailProps {
  context: EmailContext;
  publicId: string;
  onClose: () => void;
}

export function DeliveryDetail({ context, publicId, onClose }: DeliveryDetailProps) {
  const { t } = useTranslation("platform-email-deliveries");
  const access = usePlatformAccess();
  const { titleId, descriptionId } = useDialogIds();
  const command = usePlatformCommand();
  const [action, setAction] = useState<DeliveryAction>();
  const [reason, setReason] = useState("");
  const { data, isPending, error } = useQuery({
    ...deliveryQuery(access.user?.publicId ?? "", context, publicId),
    enabled: access.availability(operations.delivery.key).state === "enabled",
    retry: false,
  });

  function begin(next: DeliveryAction) {
    setReason("");
    setAction(next);
  }

  function confirm() {
    if (!action || !data || !reason.trim()) return;
    const next = action;
    void command.run(
      (next === "retry" ? operations.retryDelivery : operations.cancelDelivery).key,
      (check) => changeDelivery(next, data, reason.trim(), check),
      () => setAction(undefined),
    );
  }

  return (
    <Dialog
      open
      onClose={onClose}
      dismissible={!command.pending}
      titleId={titleId}
      descriptionId={descriptionId}
      className="max-h-[calc(100dvh-2rem)] max-w-5xl overflow-y-auto p-0"
    >
      <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4 sm:px-6">
        <div className="min-w-0">
          <DialogTitle id={titleId}>{t("detail.title")}</DialogTitle>
          <DialogDescription id={descriptionId} className="mt-1 max-w-3xl">
            {t("detail.description")}
          </DialogDescription>
        </div>
        <Button
          variant="ghost"
          size="iconXs"
          aria-label={t("detail.close")}
          title={t("detail.close")}
          onClick={onClose}
        >
          <X size={15} aria-hidden="true" />
        </Button>
      </div>

      {isPending && (
        <output className="block m-5 space-y-3 sm:m-6" aria-label={t("loading")}>
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-32 w-full" />
        </output>
      )}
      {error && (
        <div
          role="alert"
          className="m-5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4 sm:m-6"
        >
          <DetailFailure kind={readFailure(error)} />
        </div>
      )}
      {data && (
        <DeliveryBody
          delivery={data}
          action={action}
          reason={reason}
          onReason={setReason}
          onBegin={begin}
          onBack={() => setAction(undefined)}
          onConfirm={confirm}
          onClose={onClose}
          command={command}
        />
      )}
    </Dialog>
  );
}

interface DeliveryBodyProps {
  delivery: DeliveryRecord;
  action: DeliveryAction | undefined;
  reason: string;
  onReason: (value: string) => void;
  onBegin: (action: DeliveryAction) => void;
  onBack: () => void;
  onConfirm: () => void;
  onClose: () => void;
  command: ReturnType<typeof usePlatformCommand>;
}

function DeliveryBody({
  delivery,
  action,
  reason,
  onReason,
  onBegin,
  onBack,
  onConfirm,
  onClose,
  command,
}: DeliveryBodyProps) {
  const { t } = useTranslation("platform-email-deliveries");
  const locale = usePreferencesStore((state) => state.locale);
  const access = usePlatformAccess();
  const date = (value: string | null) => (value ? formatInstant(value, locale) : "—");
  const failure = (kind: string) => t(failureKey(kind));
  const allowed = (next: DeliveryAction) =>
    access.availability(
      (next === "retry" ? operations.retryDelivery : operations.cancelDelivery).key,
    ).state === "enabled";
  const timeline = delivery.timeline ?? [];
  const actionLabel = action ? t(`actions.${action}`) : "";

  return (
    <div className="space-y-6 px-5 py-5 sm:px-6 sm:py-6">
      <div className="grid gap-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4 text-sm sm:grid-cols-3">
        <div>
          <p className={eyebrow}>{t("detail.status")}</p>
          <div className="mt-2">
            <DeliveryStatusBadge status={delivery.status} />
          </div>
        </div>
        <div>
          <p className={eyebrow}>{t("detail.recipient")}</p>
          <p className="mt-2 text-[var(--color-text)]">
            <bdi dir="ltr">{delivery.maskedRecipient}</bdi>
          </p>
        </div>
        <div>
          <p className={eyebrow}>{t("detail.company")}</p>
          <div className="mt-2 text-[var(--color-text)]">
            {delivery.company ? (
              <>
                <p>{delivery.company.name}</p>
                <p className="mt-0.5 font-mono text-xs text-[var(--color-text-muted)]">
                  {delivery.company.code}
                </p>
              </>
            ) : delivery.context === "COMPANY" ? (
              t("detail.companyUnavailable")
            ) : (
              t("detail.edara")
            )}
          </div>
        </div>
      </div>

      <dl className="grid gap-x-8 gap-y-5 border-y border-[var(--color-border)] py-5 text-sm sm:grid-cols-2">
        <Fact label={t("detail.emailType")} mono>
          {delivery.emailTypeKey}
        </Fact>
        <Fact label={t("detail.templateRevision")} mono>
          {delivery.templateRevisionKey}
        </Fact>
        <Fact label={t("detail.context")}>
          {t(`context.${delivery.context}`)} ·{" "}
          {t(delivery.isTest ? "detail.test" : "detail.production")}
        </Fact>
        <Fact label={t("detail.sender")}>
          {delivery.senderAddress ? (
            <bdi dir="ltr">
              {delivery.senderName ? `${delivery.senderName} ` : ""}&lt;{delivery.senderAddress}&gt;
            </bdi>
          ) : (
            t("detail.notResolved")
          )}
        </Fact>
        <Fact label={t("detail.locale")}>
          {delivery.locale.toUpperCase()} · {t(`localeSource.${delivery.localeSource}`)}
          {delivery.localeFallbackApplied ? t("detail.fallback") : ""}
        </Fact>
        <Fact label={t("detail.timeZone")}>
          <bdi dir="ltr">{delivery.timeZone}</bdi> ·{" "}
          {t(`timeZoneSource.${delivery.timeZoneSource}`)}
          {delivery.timeZoneFallbackApplied ? t("detail.fallback") : ""}
        </Fact>
        <Fact label={t("detail.deliveryId")} mono>
          {delivery.publicId}
        </Fact>
        <Fact label={t("detail.created")}>
          <span className="tabular-nums">{date(delivery.createdAt)}</span>
        </Fact>
        <Fact label={t("detail.sentAt")}>
          <span className="tabular-nums">{date(delivery.sentAt)}</span>
        </Fact>
        <Fact label={t("detail.lastFailureKind")}>
          {delivery.lastFailureKind ? failure(delivery.lastFailureKind) : t("detail.noFailure")}
        </Fact>
      </dl>

      {action && (
        <section
          aria-labelledby="delivery-action-title"
          className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4"
        >
          <h2 id="delivery-action-title" className="text-sm font-semibold text-[var(--color-text)]">
            {t("actions.confirmTitle", { action: actionLabel })}
          </h2>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">{t("actions.hint")}</p>
          <Label htmlFor="delivery-action-reason" className="mt-4 block">
            {t("actions.reasonLabel")}
          </Label>
          <Textarea
            id="delivery-action-reason"
            value={reason}
            onChange={(event) => onReason(event.target.value)}
            maxLength={500}
            disabled={command.pending}
            className="mt-2 min-h-24"
            placeholder={t("actions.reasonPlaceholder")}
          />
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <Button variant="secondary" onClick={onBack} disabled={command.pending}>
              {t("actions.back")}
            </Button>
            <Button
              intent={action === "cancel" ? "destructive" : "cta"}
              onClick={onConfirm}
              disabled={!reason.trim() || command.pending || command.blocked}
              isLoading={command.pending}
            >
              {actionLabel}
            </Button>
          </div>
        </section>
      )}

      {command.outcome && (
        <p role="status" className="text-sm text-[var(--color-text-muted)]">
          {t(`result.${command.outcome.kind}`)}
        </p>
      )}
      {command.blocked && command.outcome?.kind !== "contract" && (
        <Button
          intent="action"
          size="sm"
          onClick={() => void command.reconcile()}
          disabled={command.pending}
        >
          {t("reconcile")}
        </Button>
      )}

      <section
        aria-labelledby="delivery-timeline-title"
        className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]"
      >
        <div className="flex items-baseline justify-between gap-3 border-b border-[var(--color-border)] p-4">
          <div>
            <h2
              id="delivery-timeline-title"
              className="text-sm font-semibold text-[var(--color-text)]"
            >
              {t("timeline.title")}
            </h2>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              {t("timeline.description")}
            </p>
          </div>
          <span className="shrink-0 text-xs tabular-nums text-[var(--color-text-muted)]">
            {t("timeline.events", { count: timeline.length })}
          </span>
        </div>
        <ol className="relative px-4 py-1">
          <span
            aria-hidden="true"
            className="absolute bottom-5 start-7 top-5 w-px bg-[var(--color-border)]"
          />
          {timeline.map((entry, index) => (
            <li
              key={`${entry.stage}-${entry.occurredAt}-${index}`}
              className="relative grid grid-cols-[24px_minmax(0,1fr)] gap-3 border-b border-[var(--color-border)] py-3 last:border-b-0"
            >
              <span
                aria-hidden="true"
                className="relative z-10 flex size-6 items-center justify-center bg-[var(--color-surface)]"
              >
                <StageIcon stage={entry.stage} />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                  <p className="text-sm font-semibold text-[var(--color-text)]">
                    {t(`stage.${entry.stage}`)}
                  </p>
                  <p className="text-xs tabular-nums text-[var(--color-text-muted)]">
                    {date(entry.occurredAt)}
                  </p>
                </div>
                {(entry.attemptNumber || entry.failureKind) && (
                  <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                    {[
                      entry.attemptNumber
                        ? t("timeline.attempt", { number: entry.attemptNumber })
                        : undefined,
                      entry.failureKind ? failure(entry.failureKind) : undefined,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
                {entry.reason && (
                  <p className="mt-2 border-s border-[var(--color-border)] ps-3 text-xs leading-5 text-[var(--color-text-muted)]">
                    <bdi dir="auto">{entry.reason}</bdi>
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </section>

      {!action && (
        <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--color-border)] pt-4">
          {canRetry(delivery.status) && allowed("retry") && (
            <Button
              intent="action"
              disabled={command.pending || command.blocked}
              onClick={() => onBegin("retry")}
            >
              {t("actions.retry")}
            </Button>
          )}
          {canCancel(delivery.status) && allowed("cancel") && (
            <Button
              intent="destructive-trigger"
              disabled={command.pending || command.blocked}
              onClick={() => onBegin("cancel")}
            >
              {t("actions.cancel")}
            </Button>
          )}
          <Button variant="secondary" onClick={onClose}>
            {t("actions.close")}
          </Button>
        </div>
      )}
    </div>
  );
}

function DetailFailure({ kind }: { kind: ReturnType<typeof readFailure> }) {
  const { t } = useTranslation(["platform-email-deliveries", "common"]);
  if (kind === "contract")
    return <p className="text-sm text-[var(--color-text)]">{t("common:query.contract")}</p>;
  if (kind === "restricted")
    return <p className="text-sm text-[var(--color-text)]">{t("common:query.refused")}</p>;
  return (
    <>
      <p className="text-sm font-semibold text-[var(--color-text)]">
        {t("error.unavailable.title")}
      </p>
      <p className="mt-1 text-xs text-[var(--color-text-muted)]">
        {t("error.unavailable.description")}
      </p>
    </>
  );
}
