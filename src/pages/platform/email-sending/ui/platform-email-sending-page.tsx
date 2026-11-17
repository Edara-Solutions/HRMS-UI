import { useQuery } from "@tanstack/react-query";
import { Building2, Mail, PauseCircle, PlayCircle, RefreshCw, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { usePlatformCommand } from "@/features/platform-communications-command";
import { platformCommunicationsOperations as operations, usePlatformAccess } from "@/shared/api";
import { RouteAccessRefusal } from "@/shared/auth";
import { usePreferencesStore } from "@/shared/config";
import { cn } from "@/shared/lib/cn";
import { formatInstant } from "@/shared/lib/format-instant";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { Label } from "@/shared/ui/label";
import { Skeleton } from "@/shared/ui/skeleton";
import { Textarea } from "@/shared/ui/textarea";
import { changeSending, type SendingContextStatus, sendingQuery } from "../api/email-sending";

const CONTEXT_ORDER = ["EDARA", "COMPANY"] as const;

export function PlatformEmailSendingPage() {
  const { t } = useTranslation("platform-email-sending");
  const access = usePlatformAccess();
  const command = usePlatformCommand();
  const [target, setTarget] = useState<SendingContextStatus>();
  const [reason, setReason] = useState("");
  const { data, error, isPending, refetch } = useQuery({
    ...sendingQuery(access.user?.publicId ?? ""),
    enabled: access.availability(operations.sendingStatus.key).state === "enabled",
    retry: false,
  });
  if (!access.user) return null;
  if (access.availability(operations.sendingStatus.key).state === "hidden")
    throw new RouteAccessRefusal("platform");
  const byContext = new Map(data?.items.map((item) => [item.context, item]));
  const pausing = target ? !target.paused : false;

  return (
    <div className="mx-auto max-w-5xl space-y-7">
      <header className="max-w-2xl border-b border-[var(--color-border)] pb-6">
        <p className="mb-2 flex items-center gap-2 text-xs font-medium text-[var(--color-primary)]">
          <Mail size={14} aria-hidden="true" />
          {t("eyebrow")}
        </p>
        <h1 className="text-[26px] font-bold tracking-tight text-[var(--color-text)]">
          {t("title")}
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">{t("intro")}</p>
      </header>

      {isPending && (
        <output className="block grid gap-5 md:grid-cols-2" aria-label={t("loading")}>
          <Skeleton className="h-52" />
          <Skeleton className="h-52" />
        </output>
      )}

      {error && (
        <Card className="p-8 text-center" role="alert">
          <p className="text-sm font-semibold text-[var(--color-text)]">{t("unavailable.title")}</p>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            {t("unavailable.description")}
          </p>
          <Button
            intent="action"
            size="sm"
            className="mt-4"
            leadingIcon={<RefreshCw size={14} aria-hidden="true" />}
            onClick={() => void refetch()}
          >
            {t("retry")}
          </Button>
        </Card>
      )}

      {data && !data.items.length && (
        <p className="text-sm text-[var(--color-text-muted)]">{t("empty")}</p>
      )}

      {data && data.items.length > 0 && (
        <section className="grid gap-5 md:grid-cols-2" aria-label={t("title")}>
          {CONTEXT_ORDER.map((context) => {
            const item = byContext.get(context);
            return item ? (
              <SendingContextCard
                key={context}
                status={item}
                disabled={command.pending || command.blocked}
                onChange={() => {
                  setReason("");
                  setTarget(item);
                }}
              />
            ) : null;
          })}
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
          disabled={command.pending}
          onClick={() => void command.reconcile()}
        >
          {t("reconcile")}
        </Button>
      )}

      <ConfirmDialog
        open={!!target}
        tone={pausing ? "destructive" : "consequential"}
        title={t(pausing ? "pauseTitle" : "resumeTitle")}
        description={
          target
            ? `${t(`context.${target.context}`)} · ${t(pausing ? "pauseDescription" : "resumeDescription")}`
            : ""
        }
        confirmLabel={t(pausing ? "confirmPause" : "confirmResume")}
        cancelLabel={t("cancel")}
        isLoading={command.pending}
        confirmDisabled={!target || !!error || command.blocked || (pausing && !reason.trim())}
        onClose={() => setTarget(undefined)}
        onConfirm={() => {
          if (!target) return;
          const selected = target;
          void command.run(
            (selected.paused ? operations.resumeSending : operations.pauseSending).key,
            (check) => changeSending(selected, reason.trim(), check),
            () => setTarget(undefined),
          );
        }}
      >
        {pausing && (
          <div className="mt-4">
            <Label htmlFor="sending-pause-reason">{t("reason")}</Label>
            <Textarea
              id="sending-pause-reason"
              className="mt-1.5 min-h-20"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={t("reasonPlaceholder")}
              maxLength={500}
              disabled={command.pending}
            />
          </div>
        )}
      </ConfirmDialog>
    </div>
  );
}

interface SendingContextCardProps {
  status: SendingContextStatus;
  disabled: boolean;
  onChange: () => void;
}

function SendingContextCard({ status, disabled, onChange }: SendingContextCardProps) {
  const { t } = useTranslation("platform-email-sending");
  const locale = usePreferencesStore((state) => state.locale);
  const access = usePlatformAccess();
  const availability = access.availability(
    (status.paused ? operations.resumeSending : operations.pauseSending).key,
  );
  const Icon = status.context === "EDARA" ? ShieldCheck : Building2;
  const titleId = `sending-${status.context}-title`;

  return (
    <Card
      as="section"
      aria-labelledby={titleId}
      className="flex min-h-[236px] flex-col overflow-hidden"
    >
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-4">
        <div className="flex min-w-0 gap-3">
          <span
            aria-hidden="true"
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-md)]",
              status.paused
                ? "bg-[var(--color-warning-soft)] text-[var(--color-warning)]"
                : "bg-[var(--color-primary-soft)] text-[var(--color-primary)]",
            )}
          >
            <Icon size={16} />
          </span>
          <div className="min-w-0">
            <CardTitle id={titleId}>{t(`context.${status.context}`)}</CardTitle>
            <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-muted)]">
              {t(`description.${status.context}`)}
            </p>
          </div>
        </div>
        <Badge variant={status.paused ? "warning" : "success"}>
          {t(status.paused ? "paused" : "active")}
        </Badge>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-5 p-[18px]">
        <p className="text-xs leading-relaxed text-[var(--color-text-muted)]">
          {t(status.paused ? "pausedDescription" : "activeDescription")}
        </p>

        {status.paused && status.reason && (
          <dl className="rounded-[var(--radius-md)] border border-[color-mix(in_srgb,var(--color-warning)_45%,var(--color-border))] bg-[var(--color-warning-soft)] p-3">
            <dt className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-faint)]">
              {t("reason")}
            </dt>
            <dd className="mt-0.5 text-xs text-[var(--color-text)]">
              <bdi dir="auto">{status.reason}</bdi>
            </dd>
          </dl>
        )}

        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] pt-4">
          <p className="text-xs text-[var(--color-text-faint)]">
            {status.updatedAt ? (
              <>
                {t("updated")}{" "}
                <time dateTime={status.updatedAt} className="tabular-nums">
                  {formatInstant(status.updatedAt, locale)}
                </time>
              </>
            ) : (
              t("neverUpdated")
            )}
          </p>
          {availability.state !== "hidden" &&
            (status.paused ? (
              <Button
                intent="action"
                leadingIcon={<PlayCircle size={16} aria-hidden="true" />}
                disabled={disabled || availability.state !== "enabled"}
                onClick={onChange}
              >
                {t("resume")}
              </Button>
            ) : (
              <Button
                intent="destructive-trigger"
                leadingIcon={<PauseCircle size={16} aria-hidden="true" />}
                disabled={disabled || availability.state !== "enabled"}
                onClick={onChange}
              >
                {t("pause")}
              </Button>
            ))}
        </div>
      </CardContent>
    </Card>
  );
}
