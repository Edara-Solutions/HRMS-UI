import { useQuery } from "@tanstack/react-query";
import { Building2, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { usePlatformCommand } from "@/features/platform-communications-command";
import { platformCommunicationsOperations as operations, usePlatformAccess } from "@/shared/api";
import { RouteAccessRefusal } from "@/shared/auth";
import { usePreferencesStore } from "@/shared/config";
import { formatInstant } from "@/shared/lib/format-instant";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { Input } from "@/shared/ui/input";
import { PageHeader } from "@/shared/ui/page-header";
import { QueryPanel } from "@/shared/ui/query-panel";
import { changeSending, type SendingContextStatus, sendingQuery } from "../api/email-sending";
export function PlatformEmailSendingPage() {
  const { t } = useTranslation("platform-email-sending");
  const locale = usePreferencesStore((state) => state.locale);
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
  return (
    <div className="mx-auto min-w-0 max-w-5xl space-y-6 [overflow-wrap:anywhere] [&_button]:max-w-full [&_button]:whitespace-normal [&_button]:h-auto [&_button]:min-h-9">
      <PageHeader title={t("title")} description={t("intro")} />
      <QueryPanel
        title={t("contexts")}
        pending={isPending}
        error={error}
        retry={() => void refetch()}
      >
        {!data?.items.length && <p>{t("empty")}</p>}
        <ul className="grid gap-4 md:grid-cols-2">
          {data?.items.map((item) => {
            const action = item.paused ? operations.resumeSending : operations.pauseSending;
            const availability = access.availability(action.key);
            const Icon = item.context === "EDARA" ? ShieldCheck : Building2;
            return (
              <li
                key={item.context}
                className="flex min-w-0 flex-col gap-4 rounded-[var(--radius-md)] border border-[var(--color-border)] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <Icon
                      size={18}
                      className="mt-0.5 shrink-0 text-[var(--color-primary)]"
                      aria-hidden="true"
                    />
                    <div>
                      <h3 className="font-semibold">{t(`context.${item.context}`)}</h3>
                      <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                        {t(`description.${item.context}`)}
                      </p>
                    </div>
                  </div>
                  <Badge variant={item.paused ? "warning" : "success"}>
                    {t(item.paused ? "paused" : "running")}
                  </Badge>
                </div>
                <p className="text-sm text-[var(--color-text-muted)]">
                  {t(item.paused ? "resumeHint" : "pauseHint")}
                </p>
                {item.paused && item.reason && (
                  <dl className="text-sm">
                    <dt className="text-xs text-[var(--color-text-muted)]">{t("reason")}</dt>
                    <dd className="mt-1 break-words">{item.reason}</dd>
                  </dl>
                )}
                <div className="mt-auto flex flex-wrap items-end justify-between gap-3 border-t border-[var(--color-border)] pt-3">
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {item.updatedAt ? (
                      <>
                        <span>{t("updated")}: </span>
                        <time dateTime={item.updatedAt}>
                          {formatInstant(item.updatedAt, locale)}
                        </time>
                      </>
                    ) : (
                      t("neverUpdated")
                    )}
                  </p>
                  {availability.state !== "hidden" && (
                    <Button
                      disabled={
                        availability.state !== "enabled" || command.pending || command.blocked
                      }
                      onClick={() => {
                        setTarget(item);
                        setReason("");
                      }}
                    >
                      {t(item.paused ? "resume" : "pause")}
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </QueryPanel>
      {command.outcome && <p role="status">{t(`result.${command.outcome.kind}`)}</p>}
      {command.blocked && command.outcome?.kind !== "contract" && (
        <Button disabled={command.pending} onClick={() => void command.reconcile()}>
          {t("reconcile")}
        </Button>
      )}
      <ConfirmDialog
        open={!!target}
        title={t(target?.paused ? "resume" : "pause")}
        description={
          target
            ? `${t(`context.${target.context}`)} · ${t(target.paused ? "resumeHint" : "pauseHint")}`
            : ""
        }
        confirmLabel={t("confirm")}
        cancelLabel={t("cancel")}
        isLoading={command.pending}
        confirmDisabled={
          !target || !!error || command.blocked || (!target.paused && !reason.trim())
        }
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
        {target && !target.paused && (
          <label className="mt-3 block">
            {t("reason")}
            <Input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={500}
              disabled={command.pending}
            />
          </label>
        )}
      </ConfirmDialog>
    </div>
  );
}
