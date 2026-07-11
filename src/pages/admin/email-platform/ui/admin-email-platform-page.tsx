import { useNavigate, useSearch } from "@tanstack/react-router";
import { Building2, Info, Mail, MailX, RefreshCw, Send, ShieldCheck } from "lucide-react";
import { usePreferencesStore } from "@/shared/config";
import type { SupportedLocale } from "@/shared/i18n";
import { cn } from "@/shared/lib/cn";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
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
} from "../api/email-platform";
import {
  companyPreviewContainsEdaraIdentity,
  defaultEmailTypeKey,
  emailTypeTitle,
} from "../model/email-platform";
import { type EmailPlatformCopy, getEmailPlatformCopy } from "../model/email-platform-copy";

type ContextFilter = "ALL" | EmailContext;
type PreviewView = "html" | "text";

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
}

function PreviewPanel({
  emailType,
  displayLocale,
  copy,
  locale,
  view,
  onLocaleChange,
  onViewChange,
}: PreviewPanelProps) {
  const localeSupported = emailType.supportedLocales.includes(locale);
  const preview = useEmailPreview(localeSupported ? emailType : undefined, locale);
  const title = emailTypeTitle(emailType, displayLocale);
  const hasCompanyIdentityViolation =
    preview.data !== undefined &&
    emailType.context === "COMPANY" &&
    companyPreviewContainsEdaraIdentity(preview.data);
  const safePreview = hasCompanyIdentityViolation ? undefined : preview.data;

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
        {!localeSupported ? (
          <div className="p-6 text-center" role="alert">
            <p className="text-sm font-semibold text-[var(--color-text)]">
              {copy.previewLocaleUnavailable}
            </p>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              {copy.previewLocaleUnavailableDescription}
            </p>
          </div>
        ) : null}
        {localeSupported && preview.isPending ? (
          <div className="space-y-3 p-4" role="status" aria-label={copy.loadingPreview}>
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-[360px] w-full" />
          </div>
        ) : null}
        {localeSupported && preview.isError ? (
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
                  srcDoc={safePreview.html}
                />
              ) : (
                <pre
                  className="min-h-[360px] whitespace-pre-wrap rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-start text-xs leading-relaxed text-[var(--color-text)]"
                  dir={locale === "ar" ? "rtl" : "ltr"}
                  aria-label={`${title} ${copy.plainTextPreview}`}
                >
                  {safePreview.text}
                </pre>
              )}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

interface TestSendUnavailableProps {
  copy: EmailPlatformCopy;
}

function TestSendUnavailable({ copy }: TestSendUnavailableProps) {
  return (
    <Card as="section" aria-labelledby="test-send-title">
      <CardHeader>
        <CardTitle id="test-send-title">{copy.testSend}</CardTitle>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">{copy.testSendDescription}</p>
      </CardHeader>
      <CardContent className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1 space-y-2">
            <Label htmlFor="email-platform-test-recipient">{copy.testRecipient}</Label>
            <Input
              id="email-platform-test-recipient"
              type="email"
              placeholder={copy.testRecipientPlaceholder}
              disabled
              aria-describedby="test-send-readiness"
            />
          </div>
          <Button leadingIcon={<Send size={16} aria-hidden="true" />} disabled>
            {copy.queueTestEmail}
          </Button>
        </div>
        <div
          id="test-send-readiness"
          className="mt-3 flex items-start gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3"
        >
          <Info
            size={15}
            className="mt-1 shrink-0 text-[var(--color-text-muted)]"
            aria-hidden="true"
          />
          <div>
            <p className="text-xs font-semibold text-[var(--color-text)]">
              {copy.testQueueUnavailable}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-muted)]">
              {copy.testQueueUnavailableDescription}
            </p>
          </div>
        </div>
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
                />
                <TestSendUnavailable copy={copy} />
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
