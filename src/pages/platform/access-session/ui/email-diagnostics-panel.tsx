import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { delegatedCompanyOperations as operations } from "@/shared/api";
import { usePreferencesStore } from "@/shared/config";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { EmailPreviewFrame } from "@/shared/ui/email-preview-frame";
import { EnumSelect } from "@/shared/ui/enum-select";
import { Label } from "@/shared/ui/label";
import { QueryPanel } from "@/shared/ui/query-panel";
import { diagnosticQueries } from "../api/email-diagnostics";
import {
  type DiagnosticReceipt,
  type DiagnosticState,
  type DiagnosticType,
  diagnosticTypes,
  isDiagnosticType,
  replayAllowed,
} from "../model/email-diagnostics";
import type { AccessSessionWorkspace } from "../model/use-access-session-workspace";

interface Props {
  workspace: AccessSessionWorkspace;
}

export function EmailDiagnosticsPanel({ workspace }: Props) {
  const preview = workspace.availability(operations.diagnosticTypes).state === "enabled";
  const send = workspace.availability(operations.diagnosticSend).state === "enabled";
  if (!preview && !send) return null;
  return <DiagnosticSelection workspace={workspace} previewAllowed={preview} sendAllowed={send} />;
}

interface SelectionProps extends Props {
  previewAllowed: boolean;
  sendAllowed: boolean;
}

function DiagnosticSelection({ workspace, previewAllowed, sendAllowed }: SelectionProps) {
  const { t } = useTranslation("platform-access-session");
  const preferredLocale = usePreferencesStore((state) => state.locale);
  const [locale, setLocale] = useState<"en" | "ar">(
    () => workspace.diagnostics.state.command?.locale ?? preferredLocale,
  );
  const [type, setType] = useState<DiagnosticType>(() => {
    const key = workspace.diagnostics.state.command?.emailTypeKey;
    return key && isDiagnosticType(key) ? key : "employee-invitation";
  });
  const queries = diagnosticQueries(
    workspace.access.user?.publicId ?? "",
    workspace.session?.publicId ?? "",
  );
  const {
    data: catalogue,
    isPending: cataloguePending,
    error: catalogueError,
    refetch: refetchCatalogue,
  } = useQuery({ ...queries.types, enabled: previewAllowed });
  const choices = previewAllowed
    ? (catalogue?.items.filter((item) => isDiagnosticType(item.key)) ?? [])
    : diagnosticTypes.map((key) => ({ key, supportedLocales: ["en", "ar"] }));
  const selected = choices.find((item) => item.key === type);
  const supported = selected?.supportedLocales.some((value) => value === locale) ?? false;
  const { state } = workspace.diagnostics;
  const editable = ["idle", "accepted"].includes(state.phase);

  return (
    <QueryPanel
      title={t("diagnostics.title")}
      pending={previewAllowed && cataloguePending}
      error={previewAllowed ? catalogueError : undefined}
      retry={() => void refetchCatalogue()}
    >
      <p className="text-sm text-[var(--color-text-muted)]">{t("diagnostics.description")}</p>
      {choices.length === 0 ? (
        <div className="space-y-3">
          <p role="status">{t("diagnostics.empty")}</p>
          <Button intent="action" onClick={() => void refetchCatalogue()}>
            {t("retry")}
          </Button>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="diagnostic-type">{t("diagnostics.type")}</Label>
              <EnumSelect
                id="diagnostic-type"
                value={type}
                disabled={!editable}
                options={choices.map((item) => ({
                  value: item.key,
                  label: t(
                    isDiagnosticType(item.key)
                      ? `diagnostics.types.${item.key}`
                      : "diagnostics.unavailable",
                  ),
                }))}
                onValueChange={(value) => {
                  if (isDiagnosticType(value)) setType(value);
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="diagnostic-locale">{t("diagnostics.locale")}</Label>
              <EnumSelect
                id="diagnostic-locale"
                value={locale}
                disabled={!editable}
                options={["en", "ar"].map((value) => ({
                  value,
                  label: t(`email.locale.${value}`),
                }))}
                onValueChange={(value) => {
                  if (value === "en" || value === "ar") setLocale(value);
                }}
              />
            </div>
          </div>
          {!supported && <p role="status">{t("diagnostics.unavailable")}</p>}
          {previewAllowed && supported && (
            <DiagnosticPreview
              key={`${type}:${locale}`}
              workspace={workspace}
              type={type}
              locale={locale}
            />
          )}
          {sendAllowed && (
            <DiagnosticDelivery
              workspace={workspace}
              type={type}
              locale={locale}
              supported={supported}
            />
          )}
        </>
      )}
    </QueryPanel>
  );
}

interface PreviewProps extends Props {
  type: DiagnosticType;
  locale: "en" | "ar";
}

function DiagnosticPreview({ workspace, type, locale }: PreviewProps) {
  const { t } = useTranslation("platform-access-session");
  const queries = diagnosticQueries(
    workspace.access.user?.publicId ?? "",
    workspace.session?.publicId ?? "",
  );
  const { data: preview, isPending, error, refetch } = useQuery(queries.preview(type, locale));
  return (
    <QueryPanel
      title={t("diagnostics.preview")}
      pending={isPending}
      error={error}
      retry={() => void refetch()}
    >
      {preview && (
        <div className="min-w-0 space-y-3">
          <dl className="space-y-2 break-words text-sm">
            <div>
              <dt className="text-[var(--color-text-muted)]">{t("diagnostics.subject")}</dt>
              <dd dir={locale === "ar" ? "rtl" : "ltr"}>{preview.subject}</dd>
            </div>
            <div>
              <dt className="text-[var(--color-text-muted)]">{t("email.sender")}</dt>
              <dd>
                {preview.senderIdentity.name} · <bdi>{preview.senderIdentity.address}</bdi>
              </dd>
            </div>
            <div>
              <dt className="text-[var(--color-text-muted)]">{t("diagnostics.preheader")}</dt>
              <dd dir={locale === "ar" ? "rtl" : "ltr"}>{preview.preheader}</dd>
            </div>
            <div>
              <dt className="text-[var(--color-text-muted)]">{t("email.field.replyToEmail")}</dt>
              <dd>
                <bdi>{preview.senderIdentity.replyTo}</bdi>
              </dd>
            </div>
          </dl>
          <EmailPreviewFrame
            title={t("diagnostics.frame")}
            html={preview.html}
            className="h-96 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
          />
          <details className="text-sm">
            <summary className="cursor-pointer">{t("diagnostics.plainText")}</summary>
            <pre
              dir={locale === "ar" ? "rtl" : "ltr"}
              className="mt-2 whitespace-pre-wrap break-words font-sans"
            >
              {preview.text}
            </pre>
          </details>
        </div>
      )}
    </QueryPanel>
  );
}

function useRetryClock(retryAt: number | undefined) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!retryAt) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [retryAt]);
  return Math.max(now, Date.now());
}

interface DeliveryProps extends PreviewProps {
  supported: boolean;
}

function deliveryProjection(state: DiagnosticState, now: number) {
  return {
    remaining: Math.max(0, Math.ceil(((state.retryAt ?? 0) - now) / 1000)),
    newAllowed:
      !state.sendUnavailable && ["idle", "accepted", "confirming", "pending"].includes(state.phase),
    checkAllowed:
      !state.resultUnavailable &&
      ["unknown", "accepted", "conflict", "contract"].includes(state.phase),
    replayAllowed: replayAllowed(state, now),
  };
}

function DiagnosticDelivery({ workspace, type, locale, supported }: DeliveryProps) {
  const { t } = useTranslation("platform-access-session");
  const command = workspace.diagnostics;
  const { state, checking } = command;
  const focusFeedback = useCallback(
    (element: HTMLParagraphElement | null) => {
      if (state.message && state.phase !== "confirming" && !checking) element?.focus();
    },
    [state.message, state.phase, checking],
  );
  const now = useRetryClock(state.retryAt);
  const view = deliveryProjection(state, now);
  const { remaining } = view;
  const mailbox = workspace.access.user?.email ?? "";
  return (
    <div className="space-y-3">
      <p className="break-words text-sm">
        {t("diagnostics.recipient")} <bdi>{mailbox}</bdi>
      </p>
      <p className="text-sm text-[var(--color-text-muted)]">{t("diagnostics.limit")}</p>
      {state.message && (
        <p
          ref={focusFeedback}
          role="alert"
          tabIndex={-1}
          className="text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
        >
          {t(`diagnostics.outcome.${state.message}`, { seconds: remaining })}
        </p>
      )}
      {state.receipt && <DiagnosticResult receipt={state.receipt} />}
      <div className="flex flex-wrap gap-2">
        {view.newAllowed && (
          <Button
            intent="action"
            disabled={!supported || checking || remaining > 0 || state.phase === "pending"}
            onClick={() => command.prepare(type, locale)}
          >
            {t("diagnostics.send")}
          </Button>
        )}
        {view.checkAllowed && (
          <Button
            intent="action"
            disabled={checking || remaining > 0}
            isLoading={checking}
            onClick={() => void command.check()}
          >
            {t("diagnostics.check")}
          </Button>
        )}
        {view.replayAllowed && (
          <Button intent="action" disabled={checking} onClick={command.replay}>
            {t("diagnostics.replay")}
          </Button>
        )}
        {state.phase === "pending" && <p role="status">{t("diagnostics.pending")}</p>}
      </div>
      <DiagnosticConfirmation workspace={workspace} locale={locale} />
    </div>
  );
}

function DiagnosticResult({ receipt }: { receipt: DiagnosticReceipt }) {
  const { t } = useTranslation("platform-access-session");
  return (
    <output className="block space-y-2 text-sm">
      <Badge variant={receipt.status === "SENT" ? "success" : "default"}>
        {t(`diagnostics.status.${receipt.status}`)}
      </Badge>
      <p>{t("diagnostics.evidence")}</p>
    </output>
  );
}

function DiagnosticConfirmation({ workspace, locale }: Props & { locale: "en" | "ar" }) {
  const { t } = useTranslation("platform-access-session");
  const command = workspace.diagnostics;
  const { state } = command;
  const key = state.command?.emailTypeKey;
  const type = key && isDiagnosticType(key) ? key : undefined;
  const mailbox = workspace.access.user?.email ?? "";
  return (
    <ConfirmDialog
      open={state.phase === "confirming" || state.phase === "pending"}
      isLoading={state.phase === "pending"}
      tone="consequential"
      title={t("diagnostics.confirmTitle")}
      description={t("diagnostics.confirmDescription", {
        type: type ? t(`diagnostics.types.${type}`) : t("diagnostics.unavailable"),
        locale: t(`email.locale.${state.command?.locale ?? locale}`),
        mailbox,
      })}
      confirmLabel={t("diagnostics.confirm")}
      cancelLabel={t("cancel")}
      confirmDisabled={!mailbox}
      onConfirm={() => void command.confirm()}
      onClose={command.cancel}
    />
  );
}
