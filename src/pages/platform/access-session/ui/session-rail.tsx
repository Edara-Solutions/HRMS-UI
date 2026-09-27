import { useState } from "react";
import { useTranslation } from "react-i18next";
import { usePreferencesStore } from "@/shared/config";
import { formatInstant } from "@/shared/lib/format-instant";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import type { AccessSession } from "../model/session";
import type { AccessSessionWorkspace } from "../model/use-access-session-workspace";

function displayStatus(session: AccessSession, live: boolean) {
  if (live) return "OPEN";
  if (session.status === "OPEN") return "EXPIRED";
  return session.status;
}

interface SessionRailProps {
  session: AccessSession;
  companyName: string;
  workspace: AccessSessionWorkspace;
}

export function SessionRail({ session, companyName, workspace }: SessionRailProps) {
  const { t } = useTranslation("platform-access-session");
  const locale = usePreferencesStore((state) => state.locale);
  const [confirming, setConfirming] = useState(false);
  const { close } = workspace;
  const status = displayStatus(session, workspace.state === "open");

  const facts = [
    [t("rail.company"), companyName],
    [t("rail.reason"), t(`reason.${session.reason}`)],
    [t("rail.origin"), t("rail.originValue")],
    [t("rail.openedAt"), formatInstant(session.openedAt, locale)],
    [t("rail.expiresAt"), formatInstant(session.expiresAt, locale)],
    ...(session.closedAt ? [[t("rail.closedAt"), formatInstant(session.closedAt, locale)]] : []),
  ];

  return (
    <aside aria-labelledby="session-rail-title" className="min-w-0 space-y-4">
      <Card as="section">
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle id="session-rail-title">{t("rail.title")}</CardTitle>
          <Badge variant={status === "OPEN" ? "success" : "default"}>{t(`status.${status}`)}</Badge>
        </CardHeader>
        <CardContent className="space-y-4 p-4">
          <dl className="space-y-3 text-sm">
            {facts.map(([label, value]) => (
              <div key={label} className="min-w-0 space-y-0.5">
                <dt className="text-xs text-[var(--color-text-muted)]">{label}</dt>
                <dd className="break-words">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="text-xs leading-5 text-[var(--color-text-muted)]">{t("rail.fixed")}</p>
          {workspace.closable && (
            <Button
              intent="destructive-trigger"
              disabled={close.isPending}
              onClick={() => setConfirming(true)}
            >
              {t("close.action")}
            </Button>
          )}
          <p role={close.isError ? "alert" : "status"} className="text-sm">
            {close.isError ? t("close.failed") : close.isSuccess ? t("close.confirmed") : null}
          </p>
        </CardContent>
      </Card>
      <Card as="section" aria-labelledby="session-activity-title">
        <CardHeader>
          <CardTitle id="session-activity-title">{t("activity.title")}</CardTitle>
        </CardHeader>
        <CardContent className="p-4 text-sm">
          {workspace.activity.length === 0 ? (
            <p className="text-[var(--color-text-muted)]">{t("activity.empty")}</p>
          ) : (
            <ol className="space-y-2">
              {workspace.activity.map((entry) => (
                <li key={entry.id} className="flex flex-wrap justify-between gap-x-3">
                  <span>{t(`activity.${entry.kind}`)}</span>
                  <time
                    dateTime={new Date(entry.at).toISOString()}
                    className="text-xs text-[var(--color-text-muted)]"
                  >
                    {formatInstant(new Date(entry.at).toISOString(), locale)}
                  </time>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
      <ConfirmDialog
        open={confirming}
        title={t("close.title")}
        description={t("close.description")}
        confirmLabel={t("close.confirm")}
        cancelLabel={t("cancel")}
        isLoading={close.isPending}
        onClose={() => setConfirming(false)}
        onConfirm={() => {
          close.mutate(undefined, { onSettled: () => setConfirming(false) });
        }}
      />
    </aside>
  );
}
