import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { usePlatformCommand } from "@/features/platform-communications-command";
import { platformCommunicationsOperations as operations, usePlatformAccess } from "@/shared/api";
import { RouteAccessRefusal } from "@/shared/auth";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { Input } from "@/shared/ui/input";
import { PageHeader } from "@/shared/ui/page-header";
import { QueryPanel } from "@/shared/ui/query-panel";
import { changeSending, type SendingContextStatus, sendingQuery } from "../api/email-sending";
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
        <ul className="space-y-4">
          {data?.items.map((item) => {
            const action = item.paused ? operations.resumeSending : operations.pauseSending;
            const availability = access.availability(action.key);
            return (
              <li
                key={item.context}
                className="space-y-3 rounded-[var(--radius-md)] border border-[var(--color-border)] p-4"
              >
                <h3 className="font-semibold">{t(`context.${item.context}`)}</h3>
                <Badge variant={item.paused ? "warning" : "default"}>
                  {t(item.paused ? "paused" : "running")}
                </Badge>
                <p>{item.updatedAt}</p>
                {item.paused && item.reason && <p>{item.reason}</p>}
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
