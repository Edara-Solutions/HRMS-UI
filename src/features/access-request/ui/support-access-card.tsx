import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { accessRequestOperations, usePlatformAccess } from "@/shared/api";
import { usePreferencesStore } from "@/shared/config";
import { formatInstant } from "@/shared/lib/format-instant";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { accessRequestQueries } from "../api/access-requests";
import {
  type AccessRequest,
  accessRequestDisplay,
  grantedMinutes,
  grantedScope,
  isNarrowed,
  latestRequestFor,
} from "../model/access-request";
import { useLengthLabel } from "./access-fields";
import { AccessRequestStatus } from "./access-request-status";
import { RequestAccessDialog } from "./request-access-dialog";
import { RequestActions } from "./request-actions";

interface SupportAccessCardProps {
  companyPublicId: string;
  companyName: string;
  blocked: boolean;
}

function Facts({ request }: { request: AccessRequest }) {
  const { t } = useTranslation("platform-access-session");
  const lengthLabel = useLengthLabel();
  const locale = usePreferencesStore((state) => state.locale);
  const narrowed = isNarrowed(request);
  const rows: [string, string][] = [
    [t("access.field.scope"), t(`access.scope.${grantedScope(request)}`)],
    [t("access.field.length"), lengthLabel(grantedMinutes(request))],
    [t("access.field.reason"), t(`reason.${request.reason}`)],
    [t("access.field.requestedAt"), formatInstant(request.requestedAt, locale)],
    ...(request.decider
      ? [[t("access.field.decidedBy"), request.decider.name] as [string, string]]
      : []),
  ];
  return (
    <>
      <dl className="grid grid-cols-[max-content_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-[var(--color-text-muted)]">{label}</dt>
            <dd className="min-w-0 break-words">
              <bdi>{value}</bdi>
            </dd>
          </div>
        ))}
      </dl>
      {narrowed && (
        <p className="text-xs text-[var(--color-text-muted)]">{t("access.narrowedByApprover")}</p>
      )}
    </>
  );
}

function noteFor(request: AccessRequest) {
  const display = accessRequestDisplay(request);
  if (display === "PENDING") return request.note;
  if (display === "SESSION_ENDED_BY_APPROVER") return request.session?.endNote;
  return request.decisionNote;
}

interface StatusMessage {
  key: string;
  at?: string;
}

function statusMessage(request: AccessRequest): StatusMessage | null {
  const display = accessRequestDisplay(request);
  if (display === "PENDING") return { key: "access.card.pending", at: request.lapsesAt };
  if (display === "APPROVED")
    return { key: "access.card.approved", at: request.windowEndsAt ?? undefined };
  if (display === "LAPSED" || display === "EXPIRED" || display === "SESSION_ENDED")
    return { key: `access.card.closed.${display}` };
  return null;
}

function Note({ text }: { text: string | null | undefined }) {
  if (!text) return null;
  return (
    <p className="whitespace-pre-wrap break-words rounded-[var(--radius-md)] bg-[var(--color-surface-2)] px-3 py-2 text-sm">
      <bdi>{text}</bdi>
    </p>
  );
}

export function SupportAccessCard({
  companyPublicId,
  companyName,
  blocked,
}: SupportAccessCardProps) {
  const { t } = useTranslation("platform-access-session");
  const locale = usePreferencesStore((state) => state.locale);
  const access = usePlatformAccess();
  const [requesting, setRequesting] = useState(false);
  const availability = access.availability(accessRequestOperations.ownRequests.key);
  const { data, isPending, isError } = useQuery({
    ...accessRequestQueries(access.user?.publicId ?? "").mine,
    enabled: availability.state === "enabled",
  });
  if (availability.state === "hidden") return null;

  const request = latestRequestFor(data?.items, companyPublicId);
  const display = request ? accessRequestDisplay(request) : null;
  const active = display === "PENDING" || display === "APPROVED" || display === "SESSION_OPEN";
  const message = request ? statusMessage(request) : null;
  const known = !isPending && !isError;

  return (
    <Card as="section" aria-labelledby="support-access-title">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle id="support-access-title">{t("access.card.title")}</CardTitle>
        {request && <AccessRequestStatus request={request} />}
      </CardHeader>
      <CardContent className="space-y-3 p-4">
        {isError && (
          <p role="alert" className="text-sm">
            {t("access.list.failed")}
          </p>
        )}
        {request ? (
          <Facts request={request} />
        ) : (
          <p className="text-sm text-[var(--color-text-muted)]">{t("access.card.description")}</p>
        )}
        {request && <Note text={noteFor(request)} />}
        {message && (
          <p className="text-sm text-[var(--color-text-muted)]">
            {t(message.key, { at: message.at && formatInstant(message.at, locale) })}
          </p>
        )}
        {request && <RequestActions request={request} blocked={blocked} />}
        {known && !active && (
          <Button
            intent="action"
            disabled={blocked || availability.state !== "enabled"}
            onClick={() => setRequesting(true)}
          >
            {t(request ? "access.card.requestAgain" : "access.card.request")}
          </Button>
        )}
      </CardContent>
      <RequestAccessDialog
        open={requesting}
        companyPublicId={companyPublicId}
        companyName={companyName}
        onClose={() => setRequesting(false)}
      />
    </Card>
  );
}
