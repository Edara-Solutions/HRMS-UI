import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { Building2, Mail, MailX, Maximize2, RefreshCw, Send, ShieldCheck, X } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { usePreferencesStore } from "@/shared/config";
import type { SupportedLocale } from "@/shared/i18n";
import { cn } from "@/shared/lib/cn";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Dialog, DialogDescription, DialogTitle, useDialogIds } from "@/shared/ui/dialog";
import { EmptyState } from "@/shared/ui/empty-state";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Skeleton } from "@/shared/ui/skeleton";
import {
  type EmailContext,
  type EmailLocale,
  type EmailType,
  useEmailPreview,
  useEmailTypes,
  useQueueEmailTestSend,
} from "../api/email-platform";
import {
  companyPreviewContainsEdaraIdentity,
  defaultEmailTypeKey,
  emailTypeTitle,
} from "../model/email-platform";
import { type EmailPlatformCopy, getEmailPlatformCopy } from "../model/email-platform-copy";

type ContextFilter = "ALL" | EmailContext;
type PreviewView = "html" | "text";

const TEST_EMAIL_FORM_SCHEMA = z.object({
  recipientEmail: z.string().trim().email(),
});

type TestEmailFormData = z.infer<typeof TEST_EMAIL_FORM_SCHEMA>;

function localeLabel(locale: EmailLocale): string {
  return locale === "en" ? "English" : "Arabic";
}

interface EmailTypeCardProps {
  emailType: EmailType;
  displayLocale: SupportedLocale;
  copy: EmailPlatformCopy;
  selected: boolean;
  onSelect: () => void;
}

function EmailTypeCard({ emailType, displayLocale, copy, selected, onSelect }: EmailTypeCardProps) {
  const title = emailTypeTitle(emailType, displayLocale);
  const contextLabel = emailType.context === "EDARA" ? copy.edaraEmail : copy.companyEmail;

  return (
    <article
      className={cn(
        "relative rounded-[var(--radius-lg)] border bg-[var(--color-surface)] transition-[transform,background-color,border-color] duration-[var(--motion-fast)] ease-[var(--motion-easing)] has-[:active]:scale-[0.995] motion-reduce:transition-none motion-reduce:has-[:active]:scale-100",
        selected
          ? "border-[color-mix(in_srgb,var(--color-primary)_45%,var(--color-border))] bg-[var(--color-primary-soft)]"
          : "border-[var(--color-border)] [@media(hover:hover)_and_(pointer:fine)]:hover:bg-[var(--color-surface-2)]",
      )}
    >
      <button
        type="button"
        className="absolute inset-0 z-10 rounded-[var(--radius-lg)] transition-[background-color] duration-[var(--motion-fast)] ease-[var(--motion-easing)] active:bg-[color-mix(in_srgb,var(--color-primary)_8%,transparent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] motion-reduce:transition-none"
        onClick={onSelect}
        aria-label={`${copy.previewAction} ${title} ${contextLabel}`}
        aria-pressed={selected}
      />
      <div className="pointer-events-none flex flex-wrap items-start justify-between gap-3 px-4 pt-4">
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold text-[var(--color-text)]">{title}</h2>
            <Badge variant={emailType.context === "EDARA" ? "primary" : "default"}>
              {contextLabel}
            </Badge>
          </span>
        </span>
        <Badge variant={emailType.criticality === "CRITICAL" ? "warning" : "info"}>
          {emailType.criticality === "CRITICAL" ? copy.critical : copy.operational}
        </Badge>
      </div>

      <div className="pointer-events-none px-4 pb-4 pt-2 text-start">
        <span className="block text-xs leading-relaxed text-[var(--color-text-muted)]">
          {emailType.description}
        </span>

        <span className="mt-4 grid gap-3 border-t border-[var(--color-border)] pt-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
          <span className="min-w-0">
            <span className="block text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-faint)]">
              {copy.defaultTemplate}
            </span>
            <code className="mt-1 block truncate text-[11px] text-[var(--color-text-muted)]">
              <bdi dir="ltr">{emailType.defaultTemplateKey}</bdi>
            </code>
          </span>
          <span>
            <span className="block text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-faint)]">
              {copy.payload}
            </span>
            <span className="mt-1 block text-xs tabular-nums text-[var(--color-text-muted)]">
              v{emailType.payloadVersion}
            </span>
          </span>
          <span>
            <span className="block text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-faint)]">
              {copy.locales}
            </span>
            <span className="mt-1 flex gap-1">
              {emailType.supportedLocales.map((locale) => (
                <span
                  key={locale}
                  className="rounded-[var(--radius-sm)] border border-[var(--color-border)] px-1.5 py-1 text-[10px] font-semibold uppercase text-[var(--color-text-muted)]"
                >
                  {locale}
                </span>
              ))}
            </span>
          </span>
        </span>
      </div>
    </article>
  );
}

interface CommunicationBoundaryProps {
  copy: EmailPlatformCopy;
}

function CommunicationBoundary({ copy }: CommunicationBoundaryProps) {
  return (
    <section aria-labelledby="communication-boundary-title">
      <div className="mb-3">
        <h2
          id="communication-boundary-title"
          className="text-sm font-semibold text-[var(--color-text)]"
        >
          {copy.communicationBoundary}
        </h2>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          {copy.communicationBoundaryDescription}
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="flex gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
            <ShieldCheck size={16} aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-[var(--color-text)]">{copy.edaraEmail}</h3>
            <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-muted)]">
              {copy.edaraBoundaryDescription}
            </p>
          </div>
        </div>
        <div className="flex gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-surface-2)] text-[var(--color-text-muted)]">
            <Building2 size={16} aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-[var(--color-text)]">{copy.companyEmail}</h3>
            <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-muted)]">
              {copy.companyBoundaryDescription}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

interface PreviewPanelProps {
  emailType: EmailType;
  displayLocale: SupportedLocale;
  copy: EmailPlatformCopy;
  locale: EmailLocale;
  view: PreviewView;
  onLocaleChange: (locale: EmailLocale) => void;
  onViewChange: (view: PreviewView) => void;
  preview: ReturnType<typeof useEmailPreview>;
}

const MAILBOX_SCROLLBAR_STYLES = `<style>
  html, body { min-height: 100%; margin: 0; background: #f1eee8; }
  @supports not selector(::-webkit-scrollbar) {
    body { scrollbar-color: #8a98aa #f1eee8; scrollbar-width: thin; }
  }
  html::-webkit-scrollbar, body::-webkit-scrollbar { width: 10px; height: 10px; }
  html::-webkit-scrollbar-track, body::-webkit-scrollbar-track { background: #f1eee8; }
  html::-webkit-scrollbar-thumb, body::-webkit-scrollbar-thumb { min-height: 44px; border: 2px solid #f1eee8; border-radius: 8px; background: #8a98aa; background-clip: padding-box; }
  html::-webkit-scrollbar-thumb:hover, body::-webkit-scrollbar-thumb:hover { background-color: #607994; }
  html::-webkit-scrollbar-button, body::-webkit-scrollbar-button { display: none !important; width: 0 !important; height: 0 !important; }
  html::-webkit-scrollbar-corner, body::-webkit-scrollbar-corner { background: #f1eee8; }
</style>`;

/** Styles the sandboxed document as a mailbox canvas without changing the approved email markup. */
function mailboxPreviewDocument(html: string, darkTheme: boolean): string {
  const themedStyles = darkTheme
    ? MAILBOX_SCROLLBAR_STYLES.replaceAll("#f1eee8", "#252320")
        .replaceAll("#8a98aa", "#657b96")
        .replaceAll("#607994", "#8fb8e8")
    : MAILBOX_SCROLLBAR_STYLES;
  return html.includes("</head>")
    ? html.replace("</head>", `${themedStyles}</head>`)
    : `${themedStyles}${html}`;
}

function PreviewPanel({
  emailType,
  displayLocale,
  copy,
  locale,
  view,
  onLocaleChange,
  onViewChange,
  preview,
}: PreviewPanelProps) {
  const localeSupported = emailType.supportedLocales.includes(locale);
  const requestedLocale = localeSupported ? locale : undefined;
  const [fullScreenPreviewOpen, setFullScreenPreviewOpen] = useState(false);
  const { titleId, descriptionId } = useDialogIds();
  const darkTheme = document.documentElement.dataset.theme === "dark";
  const title = emailTypeTitle(emailType, displayLocale);
  const hasCompanyIdentityViolation =
    preview.data !== undefined &&
    emailType.context === "COMPANY" &&
    companyPreviewContainsEdaraIdentity(preview.data);
  const safePreview = hasCompanyIdentityViolation ? undefined : preview.data;
  const effectiveLocale = safePreview?.locale ?? requestedLocale;
  const fallbackApplied = effectiveLocale !== undefined && effectiveLocale !== locale;

  return (
    <Card as="section" aria-labelledby="email-preview-title" className="min-w-0 overflow-hidden">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle id="email-preview-title">{copy.safePreview}</CardTitle>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            {copy.safePreviewDescription}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="flex rounded-[var(--radius-md)] bg-[var(--color-surface-2)] p-1"
            role="group"
            aria-label={copy.previewLocale}
          >
            <Button
              variant="ghost"
              size="xs"
              pressed={locale === "en"}
              disabled={!emailType.supportedLocales.includes("en")}
              onClick={() => onLocaleChange("en")}
              aria-label={copy.englishPreview}
            >
              EN
            </Button>
            <Button
              variant="ghost"
              size="xs"
              pressed={locale === "ar"}
              disabled={!emailType.supportedLocales.includes("ar")}
              onClick={() => onLocaleChange("ar")}
              aria-label={copy.arabicPreview}
            >
              AR
            </Button>
          </div>
          <div
            className="flex rounded-[var(--radius-md)] bg-[var(--color-surface-2)] p-1"
            role="group"
            aria-label={copy.previewFormat}
          >
            <Button
              variant="ghost"
              size="xs"
              pressed={view === "html"}
              onClick={() => onViewChange("html")}
              aria-label={copy.htmlPreview}
            >
              HTML
            </Button>
            <Button
              variant="ghost"
              size="xs"
              pressed={view === "text"}
              onClick={() => onViewChange("text")}
              aria-label={copy.plainTextPreview}
            >
              Text
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!requestedLocale ? (
          <div className="p-6 text-center" role="alert">
            <p className="text-sm font-semibold text-[var(--color-text)]">
              {copy.previewLocaleUnavailable}
            </p>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              {copy.previewLocaleUnavailableDescription}
            </p>
          </div>
        ) : null}
        {fallbackApplied ? (
          <output className="m-4 rounded-[var(--radius-md)] border border-[color-mix(in_srgb,var(--color-warning)_55%,var(--color-border))] bg-[var(--color-warning-soft)] p-3 text-sm text-[var(--color-text)]">
            <p className="font-semibold">{copy.previewFallback}</p>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              {copy.requestedLocale}: {localeLabel(locale)} · {copy.effectiveLocale}:{" "}
              {localeLabel(effectiveLocale)}. {copy.previewFallbackDescription}
            </p>
          </output>
        ) : null}
        {requestedLocale && preview.isPending ? (
          <div className="space-y-3 p-4" role="status" aria-label={copy.loadingPreview}>
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-[360px] w-full" />
          </div>
        ) : null}
        {requestedLocale && preview.isError ? (
          <div className="p-6 text-center" role="alert">
            <p className="text-sm font-semibold text-[var(--color-text)]">
              {copy.previewUnavailable}
            </p>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              {copy.previewUnavailableDescription}
            </p>
            <Button
              intent="action"
              size="sm"
              className="mt-4"
              leadingIcon={<RefreshCw size={14} aria-hidden="true" />}
              onClick={() => void preview.refetch()}
            >
              {copy.retryPreview}
            </Button>
          </div>
        ) : null}
        {hasCompanyIdentityViolation ? (
          <div className="p-6 text-center" role="alert">
            <p className="text-sm font-semibold text-[var(--color-text)]">
              {copy.companyPreviewBlocked}
            </p>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              {copy.companyPreviewBlockedDescription}
            </p>
            <Button
              intent="action"
              size="sm"
              className="mt-4"
              leadingIcon={<RefreshCw size={14} aria-hidden="true" />}
              onClick={() => void preview.refetch()}
            >
              {copy.retryPreview}
            </Button>
          </div>
        ) : null}
        {safePreview ? (
          <div>
            <dl className="grid gap-3 border-b border-[var(--color-border)] p-4 sm:grid-cols-2">
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-faint)]">
                  {copy.subject}
                </dt>
                <dd className="mt-1 text-xs font-medium text-[var(--color-text)]">
                  {safePreview.subject}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-faint)]">
                  {copy.preheader}
                </dt>
                <dd className="mt-1 text-xs text-[var(--color-text-muted)]">
                  {safePreview.preheader}
                </dd>
              </div>
              {safePreview.senderIdentity ? (
                <div className="sm:col-span-2">
                  <dt className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-faint)]">
                    {copy.resolvedCompanySender}
                  </dt>
                  <dd className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--color-text-muted)]">
                    <bdi dir="auto" className="font-medium text-[var(--color-text)]">
                      {safePreview.senderIdentity.name}
                    </bdi>
                    <bdi dir="ltr">{safePreview.senderIdentity.address}</bdi>
                    <span aria-hidden="true">·</span>
                    <span>{copy.replyTo}</span>
                    <bdi dir="ltr">{safePreview.senderIdentity.replyTo}</bdi>
                  </dd>
                </div>
              ) : null}
            </dl>
            <div className="bg-[var(--color-surface-2)] p-3 sm:p-4">
              {view === "html" ? (
                <iframe
                  className="h-[520px] w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]"
                  title={`${title} ${copy.emailPreview}`}
                  sandbox=""
                  referrerPolicy="no-referrer"
                  srcDoc={mailboxPreviewDocument(safePreview.html, darkTheme)}
                />
              ) : (
                <pre
                  className="min-h-[360px] whitespace-pre-wrap rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-start text-xs leading-relaxed text-[var(--color-text)]"
                  dir={effectiveLocale === "ar" ? "rtl" : "ltr"}
                  aria-label={`${title} ${copy.plainTextPreview}`}
                >
                  {safePreview.text}
                </pre>
              )}
              <Button
                variant="secondary"
                size="md"
                className="mt-3"
                leadingIcon={<Maximize2 size={15} aria-hidden="true" />}
                onClick={() => setFullScreenPreviewOpen(true)}
              >
                {copy.fullScreenPreview}
              </Button>
            </div>
            <Dialog
              open={fullScreenPreviewOpen}
              onClose={() => setFullScreenPreviewOpen(false)}
              titleId={titleId}
              descriptionId={descriptionId}
              className="flex h-[calc(100dvh-2rem)] max-w-none flex-col overflow-hidden p-4 sm:p-6"
            >
              <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--color-border)] pb-4">
                <div className="min-w-0">
                  <DialogTitle id={titleId}>{safePreview.subject}</DialogTitle>
                  <DialogDescription id={descriptionId}>
                    {copy.fullScreenPreviewDescription}
                  </DialogDescription>
                  <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                    <bdi dir="auto">{safePreview.senderIdentity?.name ?? copy.edaraEmail}</bdi>
                    <span aria-hidden="true"> · </span>
                    <bdi dir="ltr">{safePreview.senderIdentity?.address}</bdi>
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="iconXs"
                  className="shrink-0"
                  aria-label={copy.closePreview}
                  title={copy.closePreview}
                  onClick={() => setFullScreenPreviewOpen(false)}
                >
                  <X size={16} aria-hidden="true" />
                </Button>
              </div>
              <div className="min-h-0 flex-1 overflow-hidden rounded-b-[var(--radius-md)] border-x border-b border-[var(--color-border)] bg-[var(--color-surface-2)]">
                {view === "html" ? (
                  <iframe
                    className="block h-full w-full border-0 bg-[var(--color-surface-2)]"
                    title={`${title} ${copy.emailPreview}`}
                    sandbox=""
                    referrerPolicy="no-referrer"
                    srcDoc={mailboxPreviewDocument(safePreview.html, darkTheme)}
                  />
                ) : (
                  <pre
                    className="scrollbar-calm h-full overflow-auto whitespace-pre-wrap bg-[var(--color-surface)] p-4 text-start text-sm leading-relaxed text-[var(--color-text)]"
                    dir={effectiveLocale === "ar" ? "rtl" : "ltr"}
                  >
                    {safePreview.text}
                  </pre>
                )}
              </div>
            </Dialog>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

interface TestSendPanelProps {
  copy: EmailPlatformCopy;
  emailType: EmailType;
  requestedLocale: EmailLocale;
  effectiveLocale: EmailLocale | undefined;
}

function TestSendPanel({ copy, emailType, requestedLocale, effectiveLocale }: TestSendPanelProps) {
  const queueTestSend = useQueueEmailTestSend();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TestEmailFormData>({
    resolver: zodResolver(TEST_EMAIL_FORM_SCHEMA),
    defaultValues: { recipientEmail: "" },
  });
  const canQueue = effectiveLocale !== undefined;

  async function submitTestEmail({ recipientEmail }: TestEmailFormData) {
    if (!effectiveLocale) return;
    await queueTestSend.mutateAsync({
      emailType,
      locale: effectiveLocale,
      recipientEmail,
    });
  }

  return (
    <Card as="section" aria-labelledby="test-send-title">
      <CardHeader>
        <CardTitle id="test-send-title">{copy.testSend}</CardTitle>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">{copy.testSendDescription}</p>
      </CardHeader>
      <CardContent className="p-4">
        <form
          noValidate
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={handleSubmit((data) => void submitTestEmail(data))}
        >
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Label className="block" htmlFor="email-platform-test-recipient">
              {copy.testRecipient}
            </Label>
            <Input
              id="email-platform-test-recipient"
              type="email"
              placeholder={copy.testRecipientPlaceholder}
              disabled={!canQueue || queueTestSend.isPending}
              aria-invalid={Boolean(errors.recipientEmail)}
              aria-describedby={
                errors.recipientEmail ? "email-platform-test-recipient-error" : undefined
              }
              {...register("recipientEmail")}
            />
            {errors.recipientEmail ? (
              <p
                id="email-platform-test-recipient-error"
                className="text-xs text-[var(--color-danger)]"
              >
                {copy.invalidRecipientEmail}
              </p>
            ) : null}
          </div>
          <Button
            type="submit"
            leadingIcon={<Send size={16} aria-hidden="true" />}
            disabled={!canQueue || queueTestSend.isPending}
            isLoading={queueTestSend.isPending}
          >
            {copy.queueTestEmail}
          </Button>
        </form>
        <output className="mt-3 block rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
          <p className="text-xs font-semibold text-[var(--color-text)]">
            {queueTestSend.isSuccess
              ? `${copy.testEmailQueued} · ${copy.effectiveLocale}: ${localeLabel(queueTestSend.data.locale)}`
              : queueTestSend.isError
                ? copy.testEmailUnavailable
                : `${copy.requestedLocale}: ${localeLabel(requestedLocale)} · ${copy.effectiveLocale}: ${effectiveLocale ? localeLabel(effectiveLocale) : "—"}`}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-muted)]">
            {queueTestSend.isSuccess
              ? copy.testEmailQueuedDescription
              : queueTestSend.isError
                ? copy.testEmailUnavailableDescription
                : copy.testSendLocaleDescription}
          </p>
        </output>
      </CardContent>
    </Card>
  );
}

/** Platform Admin catalog for registered Email Types and secret-safe sample previews. */
export function AdminEmailPlatformPage() {
  const search = useSearch({ from: "/admin/email/" });
  const navigate = useNavigate({ from: "/admin/email/" });
  const displayLocale = usePreferencesStore((state) => state.locale);
  const copy = getEmailPlatformCopy(displayLocale);
  const catalog = useEmailTypes();
  const { context, locale, view } = search;
  const visibleEmailTypes =
    catalog.data?.items.filter((emailType) => context === "ALL" || emailType.context === context) ??
    [];
  const selectedEmailType = search.emailTypeKey
    ? visibleEmailTypes.find((emailType) => emailType.key === search.emailTypeKey)
    : visibleEmailTypes.find((emailType) => emailType.key === defaultEmailTypeKey(context));
  const hasInvalidSelection = visibleEmailTypes.length > 0 && selectedEmailType === undefined;
  const selectedLocaleSupported = selectedEmailType?.supportedLocales.includes(locale) ?? false;
  const selectedPreview = useEmailPreview(
    selectedLocaleSupported ? selectedEmailType : undefined,
    locale,
  );

  function selectEmailType(emailTypeKey: string) {
    void navigate({ search: (previous) => ({ ...previous, emailTypeKey }) });
  }

  function setContext(nextContext: ContextFilter) {
    void navigate({
      search: (previous) => ({
        ...previous,
        context: nextContext,
        emailTypeKey: undefined,
      }),
    });
  }

  function chooseDefaultEmailType() {
    void navigate({ search: (previous) => ({ ...previous, emailTypeKey: undefined }) });
  }

  function setLocale(nextLocale: EmailLocale) {
    void navigate({ search: (previous) => ({ ...previous, locale: nextLocale }) });
  }

  function setView(nextView: PreviewView) {
    void navigate({ search: (previous) => ({ ...previous, view: nextView }) });
  }

  return (
    <div className="mx-auto max-w-[1480px] space-y-8">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-[var(--color-primary)]">
            <Mail size={14} aria-hidden="true" />
            {copy.emailPlatform}
          </div>
          <h1 className="text-[26px] font-bold tracking-tight text-[var(--color-text)]">
            {copy.email}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--color-text-muted)]">
            {copy.pageDescription}
          </p>
        </div>
      </header>

      <CommunicationBoundary copy={copy} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          className="flex rounded-[var(--radius-md)] bg-[var(--color-surface-2)] p-1"
          role="group"
          aria-label={copy.catalogContext}
        >
          <Button
            variant="ghost"
            size="sm"
            pressed={context === "ALL"}
            onClick={() => setContext("ALL")}
            aria-label={copy.allContexts}
          >
            {copy.all}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            pressed={context === "EDARA"}
            onClick={() => setContext("EDARA")}
            aria-label={copy.edaraContext}
          >
            {copy.edara}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            pressed={context === "COMPANY"}
            onClick={() => setContext("COMPANY")}
            aria-label={copy.companyContext}
          >
            {copy.company}
          </Button>
        </div>
        <span className="text-xs tabular-nums text-[var(--color-text-muted)]">
          {visibleEmailTypes.length}{" "}
          {visibleEmailTypes.length === 1 ? copy.emailType : copy.emailTypes}
        </span>
      </div>

      {catalog.isPending ? (
        <div
          className="grid gap-4 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]"
          role="status"
          aria-label={copy.loadingCatalog}
        >
          <div className="space-y-3">
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
          </div>
          <Skeleton className="h-[620px]" />
        </div>
      ) : null}

      {catalog.isError ? (
        <Card className="p-8 text-center" role="alert">
          <p className="text-sm font-semibold text-[var(--color-text)]">
            {copy.catalogUnavailable}
          </p>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            {copy.catalogUnavailableDescription}
          </p>
          <Button
            intent="action"
            size="sm"
            className="mt-4"
            leadingIcon={<RefreshCw size={14} aria-hidden="true" />}
            onClick={() => void catalog.refetch()}
          >
            {copy.retryCatalog}
          </Button>
        </Card>
      ) : null}

      {catalog.data ? (
        visibleEmailTypes.length > 0 ? (
          <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
            <section aria-label={copy.emailTypeCatalog} className="min-w-0 space-y-3">
              {visibleEmailTypes.map((emailType) => (
                <EmailTypeCard
                  key={emailType.key}
                  emailType={emailType}
                  displayLocale={displayLocale}
                  copy={copy}
                  selected={emailType.key === selectedEmailType?.key}
                  onSelect={() => selectEmailType(emailType.key)}
                />
              ))}
            </section>
            {hasInvalidSelection ? (
              <Card className="p-8 text-center" role="alert">
                <p className="text-sm font-semibold text-[var(--color-text)]">
                  {copy.emailTypeUnavailable}
                </p>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  {copy.emailTypeUnavailableDescription}
                </p>
                <Button
                  intent="action"
                  size="sm"
                  className="mt-4"
                  onClick={
                    search.emailTypeKey ? chooseDefaultEmailType : () => void catalog.refetch()
                  }
                >
                  {search.emailTypeKey ? copy.chooseDefaultPreview : copy.retryCatalog}
                </Button>
              </Card>
            ) : selectedEmailType ? (
              <div className="min-w-0 space-y-4">
                <PreviewPanel
                  emailType={selectedEmailType}
                  displayLocale={displayLocale}
                  copy={copy}
                  locale={locale}
                  view={view}
                  onLocaleChange={setLocale}
                  onViewChange={setView}
                  preview={selectedPreview}
                />
                <TestSendPanel
                  copy={copy}
                  emailType={selectedEmailType}
                  requestedLocale={locale}
                  effectiveLocale={selectedPreview.data?.locale}
                />
              </div>
            ) : null}
          </div>
        ) : (
          <Card>
            <EmptyState
              icon={MailX}
              title={copy.noEmailTypes}
              description={copy.noEmailTypesDescription}
            />
          </Card>
        )
      ) : null}
    </div>
  );
}
