import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { KeyRound } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  type AccessRequest,
  AccessRequestStatus,
  AccessScopeLength,
  accessRequestQueries,
  DecideRequestDialog,
  type Decision,
  EndSessionDialog,
  type LiveAccessSession,
  RequestActions,
} from "@/features/access-request";
import { accessRequestOperations, accessSessionOperations, usePlatformAccess } from "@/shared/api";
import { RouteAccessRefusal } from "@/shared/auth";
import { usePreferencesStore } from "@/shared/config";
import { formatInstant } from "@/shared/lib/format-instant";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { PageTabs } from "@/shared/ui/page-tabs";
import { Skeleton } from "@/shared/ui/skeleton";
import { type AccessRequestsSearch, type AccessTab, accessTabs } from "../model/page-search";

const tabOperation: Record<AccessTab, { key: string }> = {
  review: accessRequestOperations.reviewRequests,
  live: accessSessionOperations.liveSessions,
  mine: accessRequestOperations.ownRequests,
  history: accessRequestOperations.reviewRequests,
};

const rowClassName =
  "grid gap-3 border-b border-[var(--color-border)] p-4 last:border-b-0 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.6fr)_auto] md:items-start";

interface RequestRowProps {
  request: AccessRequest;
  tab: AccessTab;
  own: boolean;
  onDecide: (decision: Decision) => void;
}

function RequestRow({ request, tab, own, onDecide }: RequestRowProps) {
  const { t } = useTranslation("platform-access-session");
  const locale = usePreferencesStore((state) => state.locale);
  return (
    <li className={rowClassName}>
      <div className="min-w-0">
        <p className="font-semibold">
          <bdi>{request.company.name}</bdi>
        </p>
        <p className="text-xs text-[var(--color-text-muted)]">
          {t("access.row.reasonBy", {
            reason: t(`reason.${request.reason}`),
            name: request.requester.name,
          })}
        </p>
        <p className="text-xs tabular-nums text-[var(--color-text-faint)]">
          {formatInstant(request.requestedAt, locale)}
        </p>
      </div>
      <AccessScopeLength request={request} />
      <div className="min-w-0 space-y-1 text-[13px]">
        <p className="break-words text-[var(--color-text-muted)]">
          <bdi>{request.note}</bdi>
        </p>
        {request.decisionNote && request.decider && (
          <p className="break-words">
            {t("access.row.decisionNote", {
              name: request.decider.name,
              note: request.decisionNote,
            })}
          </p>
        )}
      </div>
      <div className="flex flex-col items-start gap-2 md:items-end">
        {tab === "review" && own && (
          <span className="text-xs text-[var(--color-text-muted)]">{t("access.review.own")}</span>
        )}
        {tab === "review" && !own && (
          <div className="flex gap-2">
            <Button intent="cta" size="sm" onClick={() => onDecide("approve")}>
              {t("access.approve.confirm")}
            </Button>
            <Button intent="destructive-trigger" size="sm" onClick={() => onDecide("reject")}>
              {t("access.reject.confirm")}
            </Button>
          </div>
        )}
        {tab !== "review" && <AccessRequestStatus request={request} />}
        {tab === "mine" && <RequestActions request={request} />}
      </div>
    </li>
  );
}

interface LiveRowProps {
  session: LiveAccessSession;
  onEnd: () => void;
}

function LiveRow({ session, onEnd }: LiveRowProps) {
  const { t } = useTranslation("platform-access-session");
  const locale = usePreferencesStore((state) => state.locale);
  return (
    <li className={rowClassName}>
      <p className="font-semibold">
        <bdi>{session.company.name}</bdi>
      </p>
      <p className="text-sm">
        {t("access.live.operator", {
          name: session.operator.name,
          scope: t(`access.scope.${session.scope}`),
        })}
      </p>
      <p className="text-xs tabular-nums text-[var(--color-text-muted)]">
        {t(session.approver ? "access.live.endsApproved" : "access.live.ends", {
          at: formatInstant(session.expiresAt, locale),
          name: session.approver?.name,
        })}
      </p>
      <Button intent="destructive-trigger" size="sm" onClick={onEnd}>
        {t("access.end.confirm")}
      </Button>
    </li>
  );
}

export function PlatformAccessRequestsPage({ search }: { search: AccessRequestsSearch }) {
  const { t } = useTranslation("platform-access-session");
  const access = usePlatformAccess();
  const navigate = useNavigate();
  const [deciding, setDeciding] = useState<{ request: AccessRequest; decision: Decision }>();
  const [ending, setEnding] = useState<LiveAccessSession>();
  const tabs = accessTabs.filter(
    (tab) => access.availability(tabOperation[tab].key).state !== "hidden",
  );
  const tab = tabs.find((candidate) => candidate === search.tab) ?? tabs[0];
  const queries = accessRequestQueries(access.user?.publicId ?? "");
  const requests = useQuery({
    ...(tab === "mine" ? queries.mine : queries.review(tab === "history" ? "history" : "review")),
    enabled: tab !== undefined && tab !== "live",
  });
  const live = useQuery({ ...queries.live, enabled: tab === "live" });

  if (!access.user) return null;
  if (!tab) throw new RouteAccessRefusal("platform");

  const active = tab === "live" ? live : requests;
  const count = active.data?.items.length ?? 0;
  const viewer = access.user.publicId;

  return (
    <div className="mx-auto min-w-0 max-w-[1280px] space-y-4">
      <div>
        <h1 className="text-[26px] font-bold tracking-tight">{t("access.list.title")}</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          {t(
            tabs.includes("review")
              ? "access.list.approverDescription"
              : "access.list.operatorDescription",
          )}
        </p>
      </div>
      <Card className="overflow-hidden">
        <PageTabs
          className="mb-0 px-2"
          ariaLabel={t("access.list.title")}
          value={tab}
          onValueChange={(value) =>
            void navigate({ to: "/platform/access-requests", search: { tab: value } })
          }
          items={tabs.map((value) => ({ value, label: t(`access.tab.${value}`) }))}
        />
        {active.isPending && (
          <output aria-label={t("loading")} className="block space-y-3 p-4">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </output>
        )}
        {active.error && (
          <EmptyState
            role="alert"
            icon={KeyRound}
            title={t("access.list.failed")}
            action={
              <Button variant="secondary" size="sm" onClick={() => void active.refetch()}>
                {t("retry")}
              </Button>
            }
          />
        )}
        {active.data && count === 0 && (
          <EmptyState icon={KeyRound} title={t(`access.empty.${tab}`)} />
        )}
        {count > 0 && (
          <ul>
            {tab === "live"
              ? live.data?.items.map((session) => (
                  <LiveRow
                    key={session.publicId}
                    session={session}
                    onEnd={() => setEnding(session)}
                  />
                ))
              : requests.data?.items.map((request) => (
                  <RequestRow
                    key={request.publicId}
                    request={request}
                    tab={tab}
                    own={request.requester.publicId === viewer}
                    onDecide={(decision) => setDeciding({ request, decision })}
                  />
                ))}
          </ul>
        )}
      </Card>
      {deciding && (
        <DecideRequestDialog
          request={deciding.request}
          decision={deciding.decision}
          onClose={() => setDeciding(undefined)}
        />
      )}
      {ending && <EndSessionDialog session={ending} onClose={() => setEnding(undefined)} />}
    </div>
  );
}
