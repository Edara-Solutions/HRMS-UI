import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAudienceSession } from "@/shared/auth";
import { formatFullInstant } from "@/shared/lib/format-instant";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogDescription, DialogTitle, useDialogIds } from "@/shared/ui/dialog";
import type { SelfIdentity, SelfService } from "../api/self-service";

interface SessionListProps {
  identity: SelfIdentity;
  service: SelfService;
}

export function SessionList({ identity, service }: SessionListProps) {
  const { t, i18n } = useTranslation("auth");
  const queries = useQueryClient();
  const navigate = useNavigate();
  const state = useAudienceSession(identity.audience);
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const { titleId, descriptionId } = useDialogIds();
  const queryRoot = [identity.audience, identity.publicId, "self-sessions"];
  const sessions = useQuery({
    queryKey: [...queryRoot, page],
    queryFn: ({ signal }) => service.readSessions(page, signal),
    retry: false,
  });
  const revoke = useMutation({
    retry: false,
    mutationFn: async () => {
      if (
        identity.audience !== "company" ||
        !service.revokeSession ||
        !selectedId ||
        !sessions.data?.items.some((item) => item.id === selectedId)
      )
        throw new Error("Session unavailable");
      await service.revokeSession(selectedId);
    },
    onSuccess: async () => {
      setSelectedId(null);
      if (state.session?.sessionId === selectedId) {
        await navigate({
          to: identity.audience === "company" ? "/company/login" : "/platform/login",
        });
        return;
      }
      await queries.invalidateQueries({ queryKey: queryRoot });
      setFeedback(t("account.sessionRevoked"));
    },
    onError: async () => {
      await queries.invalidateQueries({ queryKey: queryRoot });
      setFeedback(t("account.uncertainChange"));
    },
  });

  if (sessions.isPending) return <p role="status">{t("account.loading")}</p>;
  if (sessions.isError)
    return (
      <div role="status">
        <p>{t("journey.unavailable")}</p>
        <Button className="mt-3" onClick={() => void sessions.refetch()}>
          {t("journey.retry")}
        </Button>
      </div>
    );
  return (
    <div className="max-w-3xl space-y-4">
      {feedback ? (
        <p role="status" className="text-sm">
          {feedback}
        </p>
      ) : null}
      {sessions.data.items.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)]">{t("account.noSessions")}</p>
      ) : (
        <ul className="divide-y divide-[var(--color-border)] rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]">
          {sessions.data.items.map((session) => (
            <li key={session.id} className="flex flex-wrap items-start justify-between gap-3 p-4">
              <div className="min-w-0 space-y-1">
                <p className="break-words text-sm font-medium">
                  {session.deviceName ?? t(`account.client.${session.clientType}`)}
                  {session.isCurrent ? (
                    <span className="ms-2 text-xs text-[var(--color-text-muted)]">
                      {t("account.currentSession")}
                    </span>
                  ) : null}
                </p>
                <p className="break-words text-xs text-[var(--color-text-muted)]">
                  <bdi>{session.ipAddress}</bdi>
                  {[session.city, session.country].filter(Boolean).length
                    ? ` · ${[session.city, session.country].filter(Boolean).join(", ")}`
                    : null}
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {t("account.lastUsed")}:{" "}
                  <bdi>
                    {formatFullInstant(
                      session.lastUsedAt,
                      i18n.language.startsWith("ar") ? "ar" : "en",
                    )}
                  </bdi>
                </p>
              </div>
              {identity.audience === "company" && service.revokeSession ? (
                <Button
                  intent="destructive-trigger"
                  disabled={revoke.isPending}
                  onClick={() => setSelectedId(session.id)}
                >
                  {t("account.revoke")}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {sessions.data.meta.totalPages > 0 ? (
        <nav className="flex flex-wrap items-center gap-3" aria-label={t("account.pagination")}>
          <Button
            intent="navigation"
            disabled={page <= 1 || sessions.isFetching || revoke.isPending}
            onClick={() => setPage((current) => current - 1)}
          >
            {t("account.previous")}
          </Button>
          <p className="text-sm tabular-nums">
            {t("account.page", {
              page: sessions.data.meta.page,
              pages: sessions.data.meta.totalPages,
            })}
          </p>
          <Button
            intent="navigation"
            disabled={
              page >= sessions.data.meta.totalPages || sessions.isFetching || revoke.isPending
            }
            onClick={() => setPage((current) => current + 1)}
          >
            {t("account.next")}
          </Button>
        </nav>
      ) : null}
      <Dialog
        open={selectedId !== null}
        onClose={() => {
          if (!revoke.isPending) setSelectedId(null);
        }}
        dismissible={!revoke.isPending}
        titleId={titleId}
        descriptionId={descriptionId}
      >
        <DialogTitle id={titleId}>{t("account.revokeTitle")}</DialogTitle>
        <DialogDescription id={descriptionId}>{t("account.revokeDescription")}</DialogDescription>
        {revoke.isError ? (
          <p role="status" className="mt-3 text-sm">
            {t("account.uncertainChange")}
          </p>
        ) : null}
        <div className="mt-5 flex flex-wrap gap-2">
          <Button
            intent="destructive"
            disabled={
              revoke.isPending ||
              sessions.isFetching ||
              !sessions.data.items.some((item) => item.id === selectedId)
            }
            isLoading={revoke.isPending}
            onClick={() => revoke.mutate()}
          >
            {t("account.revoke")}
          </Button>
          <Button
            intent="dismissive"
            disabled={revoke.isPending}
            onClick={() => setSelectedId(null)}
          >
            {t("account.cancel")}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
