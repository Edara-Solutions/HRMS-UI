import { useQuery } from "@tanstack/react-query";
import { Monitor, Smartphone } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ContractViolation, usePlatformAccess } from "@/shared/api";
import type { ActionAvailability } from "@/shared/auth";
import { usePreferencesStore } from "@/shared/config";
import { formatInstant } from "@/shared/lib/format-instant";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Skeleton } from "@/shared/ui/skeleton";
import { personQueries, revokePersonSession, revokePersonSessions } from "../api/person";
import type { PersonRecord } from "../model/person";
import type { useConfirmedCommand } from "../model/use-confirmed-command";
import { RestrictionNote } from "./restriction-note";

interface PersonSessionsCardProps {
  person: PersonRecord;
  revoke: ActionAvailability;
  revokeAll: ActionAvailability;
  commands: ReturnType<typeof useConfirmedCommand>;
}

export function PersonSessionsCard({
  person,
  revoke,
  revokeAll,
  commands,
}: PersonSessionsCardProps) {
  const { t } = useTranslation("platform-people");
  const locale = usePreferencesStore((state) => state.locale);
  const access = usePlatformAccess();
  const [page, setPage] = useState(1);
  const { data, error, isPending, isError, refetch } = useQuery(
    personQueries(access.user?.publicId ?? "", person.publicId).sessions(page),
  );
  const name = `${person.firstName} ${person.lastName}`;

  return (
    <Card as="section" aria-labelledby="platform-person-sessions">
      <CardHeader>
        <CardTitle id="platform-person-sessions">{t("sessions.title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-[18px] text-sm">
        <RestrictionNote availability={revoke} />
        {isPending ? (
          <Skeleton className="h-16 w-full" />
        ) : isError ? (
          <div className="space-y-2">
            <p>
              {error instanceof ContractViolation
                ? t("state.contractUnavailable")
                : t("state.loadFailed")}
            </p>
            {!(error instanceof ContractViolation) && (
              <Button intent="action" size="sm" onClick={() => void refetch()}>
                {t("state.retry")}
              </Button>
            )}
          </div>
        ) : data.items.length === 0 ? (
          <p className="text-[var(--color-text-muted)]">{t("sessions.empty")}</p>
        ) : (
          <ul className="divide-y divide-[var(--color-border)]">
            {data.items.map((session) => {
              const device = session.deviceName ?? t(`sessions.client.${session.clientType}`);
              const place = [session.city, session.country].filter(Boolean).join(", ");
              const Icon = session.clientType === "mobile" ? Smartphone : Monitor;
              return (
                <li key={session.id} className="flex flex-wrap items-center gap-3 py-3">
                  <Icon aria-hidden="true" size={16} className="text-[var(--color-text-muted)]" />
                  <div className="me-auto min-w-0">
                    <p className="break-words font-medium">{device}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {t("sessions.lastUsed", { date: formatInstant(session.lastUsedAt, locale) })}
                      {place ? ` · ${place}` : ""}
                    </p>
                  </div>
                  {revoke.state !== "hidden" && (
                    <Button
                      intent="destructive-trigger"
                      size="sm"
                      aria-label={t("sessions.revokeLabel", { device })}
                      disabled={revoke.state === "disabled" || commands.busy}
                      onClick={() =>
                        commands.request({
                          tone: "consequential",
                          title: t("sessions.revokeConfirm.title", { device }),
                          description: t("sessions.revokeConfirm.description", { name, device }),
                          confirmLabel: t("sessions.revokeConfirm.action"),
                          success: t("sessions.revoked", { device }),
                          run: () => revokePersonSession(person.publicId, session.id),
                        })
                      }
                    >
                      {t("sessions.revokeConfirm.action")}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {data && data.meta.totalPages > 1 && (
          <div className="flex items-center justify-between gap-2">
            <Button
              intent="action"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              {t("roster.previous")}
            </Button>
            <span>{t("roster.pageOf", { page, total: data.meta.totalPages })}</span>
            <Button
              intent="action"
              size="sm"
              disabled={page >= data.meta.totalPages}
              onClick={() => setPage(page + 1)}
            >
              {t("roster.next")}
            </Button>
          </div>
        )}
        {revokeAll.state !== "hidden" && data && data.items.length > 0 && (
          <div className="border-t border-[var(--color-border)] pt-3">
            <Button
              intent="destructive-trigger"
              size="sm"
              disabled={revokeAll.state === "disabled" || commands.busy}
              onClick={() =>
                commands.request({
                  tone: "destructive",
                  title: t("sessions.revokeAllConfirm.title", { name }),
                  description: t("sessions.revokeAllConfirm.description", { name }),
                  confirmLabel: t("sessions.revokeAllConfirm.action"),
                  success: t("sessions.revokedAll", { name }),
                  run: () => revokePersonSessions(person.publicId),
                })
              }
            >
              {t("sessions.revokeAllConfirm.action")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
