import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useParams } from "@tanstack/react-router";
import { HTTPError } from "ky";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Mail,
  Palette,
  Send,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { readBackendErrorMessage } from "@/shared/api";
import { usePreferencesStore } from "@/shared/config";
import { cn } from "@/shared/lib/cn";
import { Avatar } from "@/shared/ui/avatar";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { EmptyState } from "@/shared/ui/empty-state";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Skeleton } from "@/shared/ui/skeleton";
import {
  type EmailLocale,
  type EmailTemplateAssignment,
  useAssignCompanyEmailTemplate,
  useCompanyEffectiveTemplate,
  useCompanyEmailAssignments,
  useCompanyEmailBrand,
  useCompanyEmailPreview,
  useCompanyEmailTypes,
  useCompanyEmailVariants,
  useQueueCompanyEmailTestSend,
  useRemoveCompanyEmailTemplate,
} from "../api/company-email-settings";

type Confirmation =
  | { kind: "assign"; templateRevisionKey: string }
  | { kind: "remove" }
  | undefined;

interface Notice {
  tone: "success" | "danger";
  message: string;
}

const testEmailFormSchema = z.object({
  recipientEmail: z.string().trim().email("Enter a valid recipient email address"),
});

type TestEmailFormData = z.infer<typeof testEmailFormSchema>;

const EMAIL_LOCALE_FALLBACK_COPY = {
  en: {
    title: "Translation fallback applied",
    requestedLocale: "Requested locale",
    effectiveLocale: "Effective locale",
    description: "This locale is also used when queueing a test email.",
    previewRequired: "Wait for the preview to load before queueing a test email.",
    locales: { en: "English", ar: "Arabic" },
  },
  ar: {
    title: "تم تطبيق بديل الترجمة",
    requestedLocale: "اللغة المطلوبة",
    effectiveLocale: "اللغة الفعّالة",
    description: "تُستخدم هذه اللغة أيضًا عند وضع رسالة تجريبية في الطابور.",
    previewRequired: "انتظر حتى يتم تحميل المعاينة قبل وضع رسالة تجريبية في الطابور.",
    locales: { en: "الإنجليزية", ar: "العربية" },
  },
} as const;

async function readCompanyEmailError(error: unknown, fallback: string): Promise<string> {
  if (error instanceof HTTPError) {
    if (error.response.status >= 500) return fallback;
    const backendMessage = await readBackendErrorMessage(error.response);
    if (backendMessage) return backendMessage;
  }
  return fallback;
}

function findAssignment(
  assignments: EmailTemplateAssignment[] | undefined,
  emailTypeKey: string | undefined,
): EmailTemplateAssignment | undefined {
  return assignments?.find((assignment) => assignment.emailTypeKey === emailTypeKey);
}

function emailTypeLabel(key: string): string {
  return key
    .split("-")
    .map((word) => `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}

export function AdminCompanyEmailSettingsPage() {
  const { publicId } = useParams({ from: "/admin/companies/$publicId/email-settings" });
  const navigate = useNavigate();
  const displayLocale = usePreferencesStore((state) => state.locale);
  const fallbackCopy = EMAIL_LOCALE_FALLBACK_COPY[displayLocale];
  const [selectedEmailTypeKey, setSelectedEmailTypeKey] = useState<string>();
  const [locale, setLocale] = useState<EmailLocale>("en");
  const [selectedVariantKey, setSelectedVariantKey] = useState<string>();
  const [confirmation, setConfirmation] = useState<Confirmation>();
  const [notice, setNotice] = useState<Notice>();
  const {
    register,
    handleSubmit,
    formState: { errors: testEmailErrors },
  } = useForm<TestEmailFormData>({
    resolver: zodResolver(testEmailFormSchema),
    defaultValues: { recipientEmail: "" },
  });

  const emailTypesQuery = useCompanyEmailTypes();
  const companyBrandQuery = useCompanyEmailBrand(publicId);
  const companyEmailTypes =
    emailTypesQuery.data?.filter((emailType) => emailType.context === "COMPANY") ?? [];
  const activeEmailType =
    companyEmailTypes.find((emailType) => emailType.key === selectedEmailTypeKey) ??
    companyEmailTypes[0];
  const activeEmailTypeKey = activeEmailType?.key;
  const supportedLocales = activeEmailType?.supportedLocales ?? [];
  const activeLocale = supportedLocales.includes(locale) ? locale : supportedLocales[0];
  const companyIsReady = companyBrandQuery.isSuccess;
  const assignmentsQuery = useCompanyEmailAssignments(publicId, companyIsReady);
  const assignment = findAssignment(assignmentsQuery.data, activeEmailTypeKey);
  const variantsQuery = useCompanyEmailVariants(activeEmailTypeKey, companyIsReady);
  const effectiveTemplateQuery = useCompanyEffectiveTemplate(
    publicId,
    activeEmailTypeKey,
    companyIsReady,
  );
  const previewQuery = useCompanyEmailPreview(
    publicId,
    activeEmailTypeKey,
    activeLocale,
    companyIsReady,
  );
  const effectivePreviewLocale = previewQuery.data?.locale;
  const previewFallbackApplied =
    effectivePreviewLocale !== undefined &&
    activeLocale !== undefined &&
    effectivePreviewLocale !== activeLocale;
  const assignTemplate = useAssignCompanyEmailTemplate();
  const removeTemplate = useRemoveCompanyEmailTemplate();
  const queueTestSend = useQueueCompanyEmailTestSend();
  const senderIdentity = previewQuery.data?.senderIdentity;
  const senderIdentityAvailable = senderIdentity !== undefined;
  const canQueueTest =
    senderIdentityAvailable && previewQuery.isSuccess && effectivePreviewLocale !== undefined;

  const isMutating = assignTemplate.isPending || removeTemplate.isPending;
  const activeVariantKey = selectedVariantKey ?? assignment?.templateRevisionKey;

  function returnToCompany() {
    void navigate({ to: "/admin/companies/$publicId", params: { publicId } });
  }

  function handleEmailTypeChange(nextEmailTypeKey: string) {
    const nextEmailType = companyEmailTypes.find((emailType) => emailType.key === nextEmailTypeKey);
    const nextLocale = nextEmailType?.supportedLocales.find(
      (supportedLocale) => supportedLocale === locale,
    );

    setSelectedEmailTypeKey(nextEmailTypeKey);
    if (!nextLocale && nextEmailType?.supportedLocales[0]) {
      setLocale(nextEmailType.supportedLocales[0]);
    }
    setSelectedVariantKey(undefined);
    setNotice(undefined);
  }

  function handleLocaleChange(nextLocale: string) {
    const supportedLocale = activeEmailType?.supportedLocales.find(
      (localeOption) => localeOption === nextLocale,
    );
    if (supportedLocale) setLocale(supportedLocale);
  }

  function requestAssignment() {
    if (
      !activeEmailTypeKey ||
      !selectedVariantKey ||
      selectedVariantKey === assignment?.templateRevisionKey
    ) {
      return;
    }
    setConfirmation({ kind: "assign", templateRevisionKey: selectedVariantKey });
  }

  async function confirmChange() {
    if (!confirmation || !activeEmailTypeKey) return;

    try {
      if (confirmation.kind === "assign") {
        await assignTemplate.mutateAsync({
          companyPublicId: publicId,
          emailTypeKey: activeEmailTypeKey,
          templateRevisionKey: confirmation.templateRevisionKey,
        });
        setSelectedVariantKey(confirmation.templateRevisionKey);
        setNotice({
          tone: "success",
          message:
            "Template Variant assigned. The effective Company email template has been refreshed.",
        });
      } else {
        await removeTemplate.mutateAsync({
          companyPublicId: publicId,
          emailTypeKey: activeEmailTypeKey,
        });
        setSelectedVariantKey(undefined);
        setNotice({
          tone: "success",
          message:
            "Template Assignment removed. This email now resolves to the Company Default Template.",
        });
      }
      setConfirmation(undefined);
    } catch (error) {
      setNotice({
        tone: "danger",
        message: await readCompanyEmailError(
          error,
          "The template change was not applied. It may have become unavailable or the assignment changed; refresh and try again.",
        ),
      });
      setConfirmation(undefined);
    }
  }

  async function sendTest({ recipientEmail }: TestEmailFormData) {
    if (!activeEmailTypeKey || !canQueueTest || !effectivePreviewLocale) return;

    try {
      const queuedTestSend = await queueTestSend.mutateAsync({
        companyPublicId: publicId,
        emailTypeKey: activeEmailTypeKey,
        locale: effectivePreviewLocale,
        recipientEmail,
      });
      setNotice({
        tone: "success",
        message: `Test email queued in ${fallbackCopy.locales[queuedTestSend.locale]}. Delivery proceeds through the transactional outbox.`,
      });
    } catch (error) {
      setNotice({
        tone: "danger",
        message: await readCompanyEmailError(
          error,
          "The test email could not be queued. Confirm the recipient and try again.",
        ),
      });
    }
  }

  if (emailTypesQuery.isPending || companyBrandQuery.isPending) {
    return (
      <div className="mx-auto max-w-[1120px] space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (companyBrandQuery.isError) {
    const companyResponseStatus =
      companyBrandQuery.error instanceof HTTPError
        ? companyBrandQuery.error.response.status
        : undefined;
    const companyError =
      companyResponseStatus === 404
        ? {
            title: "Company not found",
            description: "This Company no longer exists or is not available to this administrator.",
          }
        : companyResponseStatus === 403
          ? {
              title: "Company access is restricted",
              description: "You do not have permission to manage email settings for this Company.",
            }
          : {
              title: "Company email settings are unavailable",
              description:
                "The Company profile could not be loaded. Retry or return to the Company list.",
            };

    return (
      <div className="mx-auto max-w-[1120px]">
        <EmptyState
          icon={ShieldAlert}
          title={companyError.title}
          description={companyError.description}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              {companyResponseStatus !== 403 && companyResponseStatus !== 404 && (
                <Button intent="navigation" onClick={() => void companyBrandQuery.refetch()}>
                  Retry
                </Button>
              )}
              <Button
                intent="navigation"
                leadingIcon={<ArrowLeft size={14} />}
                onClick={returnToCompany}
              >
                Back to company
              </Button>
            </div>
          }
        />
      </div>
    );
  }

  if (emailTypesQuery.isError || companyEmailTypes.length === 0) {
    return (
      <div className="mx-auto max-w-[1120px]">
        <EmptyState
          icon={Mail}
          title="Company email settings are unavailable"
          description="No Company email types are available to this administrator. Check permissions or try again later."
          action={
            <Button
              intent="navigation"
              leadingIcon={<ArrowLeft size={14} />}
              onClick={returnToCompany}
            >
              Back to company
            </Button>
          }
        />
      </div>
    );
  }

  if (!activeEmailType || supportedLocales.length === 0) {
    return (
      <div className="mx-auto max-w-[1120px]">
        <EmptyState
          icon={Mail}
          title="Company email settings are unavailable"
          description="The selected Company email type has no supported locales. Configure a locale before previewing or sending email."
          action={
            <Button
              intent="navigation"
              leadingIcon={<ArrowLeft size={14} />}
              onClick={returnToCompany}
            >
              Back to company
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1120px] space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Button
            intent="navigation"
            leadingIcon={<ArrowLeft size={14} />}
            onClick={returnToCompany}
            className="mb-3"
          >
            Back to company
          </Button>
          <h1 className="text-[26px] font-bold tracking-tight text-[var(--color-text)]">
            Company email settings
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Review the sender identity, Company brand context, and registered email template
            choices.
          </p>
        </div>
        <Badge variant={senderIdentityAvailable ? "success" : "warning"}>
          {senderIdentityAvailable ? "Sender identity available" : "Sender needs attention"}
        </Badge>
      </div>

      {notice && (
        <div
          className={cn(
            "flex w-full items-start gap-2 rounded-[var(--radius-md)] border px-3 py-2.5 text-sm",
            notice.tone === "danger"
              ? "border-[color-mix(in_srgb,var(--color-danger)_55%,var(--color-border))] bg-[var(--color-danger-soft)] text-[var(--color-danger)]"
              : "border-[color-mix(in_srgb,var(--color-success)_55%,var(--color-border))] bg-[var(--color-success-soft)] text-[var(--color-success)]",
          )}
          role={notice.tone === "danger" ? "alert" : "status"}
        >
          {notice.tone === "danger" ? (
            <AlertCircle aria-hidden="true" className="mt-0.5 shrink-0" size={16} />
          ) : (
            <CheckCircle2 aria-hidden="true" className="mt-0.5 shrink-0" size={16} />
          )}
          <p>{notice.message}</p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sending identity</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {previewQuery.isPending ? (
              <Skeleton className="h-20 w-full" />
            ) : senderIdentity ? (
              <dl className="grid gap-3 text-sm">
                <div>
                  <dt className="text-[var(--color-text-faint)]">From</dt>
                  <dd className="mt-1 text-[var(--color-text)]">
                    {senderIdentity.name} &lt;{senderIdentity.address}&gt;
                  </dd>
                </div>
                <div>
                  <dt className="text-[var(--color-text-faint)]">Reply-to</dt>
                  <dd className="mt-1 text-[var(--color-text)]">{senderIdentity.replyTo}</dd>
                </div>
                <div>
                  <dt className="text-[var(--color-text-faint)]">Readiness</dt>
                  <dd className="mt-1 flex items-center gap-1.5 text-[var(--color-text)]">
                    <CheckCircle2
                      size={15}
                      className="text-[var(--color-success)]"
                      aria-hidden="true"
                    />
                    Company sender identity available for this email type
                  </dd>
                </div>
              </dl>
            ) : (
              <div className="flex gap-2 text-sm text-[var(--color-text-muted)]">
                <ShieldAlert
                  size={16}
                  className="mt-0.5 shrink-0 text-[var(--color-warning)]"
                  aria-hidden="true"
                />
                <p>
                  A Company sender identity could not be resolved for this email type. Template
                  previews and test sends remain unavailable until it is available.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Company brand</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {companyBrandQuery.isPending ? (
              <Skeleton className="h-16 w-full" />
            ) : companyBrandQuery.data ? (
              <div className="flex items-center gap-3 text-sm">
                <Avatar
                  size="md"
                  src={companyBrandQuery.data.logo ?? undefined}
                  alt={`${companyBrandQuery.data.name} logo`}
                  initials={companyBrandQuery.data.name.slice(0, 2).toUpperCase()}
                />
                <div>
                  <p className="font-medium text-[var(--color-text)]">
                    {companyBrandQuery.data.name}
                  </p>
                  <p className="mt-1 text-[var(--color-text-muted)]">
                    Logo sourced from the Company profile. Brand colors are not supplied by the
                    email-platform API, so they are not guessed or replaced with Edara branding.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex gap-2 text-sm text-[var(--color-text-muted)]">
                <Palette size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                <p>
                  The Company brand profile is unavailable. Brand colors are not supplied by the
                  email-platform API, so they are not guessed or replaced with Edara branding.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Effective Company template</CardTitle>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              Assignments can select only code-registered variants eligible for the chosen Company
              email type.
            </p>
          </div>
          <div className="w-full sm:w-64">
            <Label htmlFor="company-email-type">Company email type</Label>
            <Select value={activeEmailTypeKey} onValueChange={handleEmailTypeChange}>
              <SelectTrigger id="company-email-type" className="mt-1">
                <SelectValue placeholder="Select email type" />
              </SelectTrigger>
              <SelectContent>
                {companyEmailTypes.map((emailType) => (
                  <SelectItem key={emailType.key} value={emailType.key}>
                    {emailTypeLabel(emailType.key)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="grid gap-5 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-4">
            {effectiveTemplateQuery.isPending ? (
              <Skeleton className="h-24 w-full" />
            ) : effectiveTemplateQuery.isError || !effectiveTemplateQuery.data ? (
              <div className="flex gap-2 rounded-[var(--radius-md)] border border-[var(--color-warning)] bg-[var(--color-warning-soft)] p-3 text-sm text-[var(--color-text)]">
                <ShieldAlert
                  size={16}
                  className="mt-0.5 shrink-0 text-[var(--color-warning)]"
                  aria-hidden="true"
                />
                <p>
                  The effective template could not be resolved. Refresh before changing the
                  assignment.
                </p>
              </div>
            ) : (
              <dl className="grid gap-3 text-sm">
                <div>
                  <dt className="text-[var(--color-text-faint)]">Resolution</dt>
                  <dd className="mt-1 flex items-center gap-2 text-[var(--color-text)]">
                    <Badge variant={assignment ? "primary" : "default"}>
                      {assignment ? "Company Template Assignment" : "Company Default Template"}
                    </Badge>
                    <code className="font-mono text-xs">
                      {effectiveTemplateQuery.data.templateKey}
                    </code>
                  </dd>
                </div>
                <div>
                  <dt className="text-[var(--color-text-faint)]">Supported locales</dt>
                  <dd className="mt-1 text-[var(--color-text)]">
                    {effectiveTemplateQuery.data.supportedLocales.join(", ")}
                  </dd>
                </div>
                {!assignment && (
                  <div>
                    <dt className="text-[var(--color-text-faint)]">Default source</dt>
                    <dd className="mt-1 font-mono text-xs text-[var(--color-text)]">
                      {activeEmailType.defaultTemplateKey}
                    </dd>
                  </div>
                )}
              </dl>
            )}

            <div>
              <Label htmlFor="company-template-variant">Eligible Template Variant</Label>
              <Select
                value={activeVariantKey}
                onValueChange={setSelectedVariantKey}
                disabled={
                  variantsQuery.isPending ||
                  variantsQuery.isError ||
                  variantsQuery.data?.length === 0
                }
              >
                <SelectTrigger id="company-template-variant" className="mt-1">
                  <SelectValue placeholder="No eligible variants" />
                </SelectTrigger>
                <SelectContent>
                  {variantsQuery.data?.map((variant) => (
                    <SelectItem key={variant.key} value={variant.key}>
                      {variant.key}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {variantsQuery.isError ? (
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-muted)]">
                  <span>Eligible variants could not be loaded.</span>
                  <Button intent="navigation" onClick={() => void variantsQuery.refetch()}>
                    Retry
                  </Button>
                </div>
              ) : variantsQuery.data?.length === 0 ? (
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  No eligible registered variants are available for this email type.
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                intent="action"
                onClick={requestAssignment}
                disabled={
                  !selectedVariantKey ||
                  selectedVariantKey === assignment?.templateRevisionKey ||
                  isMutating
                }
              >
                Assign variant
              </Button>
              {assignment && (
                <Button
                  intent="destructive-trigger"
                  onClick={() => setConfirmation({ kind: "remove" })}
                  disabled={isMutating}
                >
                  Remove assignment
                </Button>
              )}
            </div>
          </div>

          <div className="min-w-0 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-[var(--color-text)]">Safe Company preview</p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Uses API-provided sample data only. The Company default locale is not exposed by
                  the email-platform API, so choose a preview locale explicitly.
                </p>
              </div>
              <Select value={activeLocale} onValueChange={handleLocaleChange}>
                <SelectTrigger aria-label="Preview locale" className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {supportedLocales.map((supportedLocale) => (
                    <SelectItem key={supportedLocale} value={supportedLocale}>
                      {supportedLocale === "en" ? "English" : "Arabic"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {previewFallbackApplied ? (
              <output className="mb-3 rounded-[var(--radius-md)] border border-[color-mix(in_srgb,var(--color-warning)_55%,var(--color-border))] bg-[var(--color-warning-soft)] p-3 text-sm text-[var(--color-text)]">
                <p className="font-medium">{fallbackCopy.title}</p>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  {fallbackCopy.requestedLocale}: {fallbackCopy.locales[activeLocale ?? "en"]} ·{" "}
                  {fallbackCopy.effectiveLocale}:{" "}
                  {fallbackCopy.locales[effectivePreviewLocale ?? "en"]}. {fallbackCopy.description}
                </p>
              </output>
            ) : null}
            {previewQuery.isPending ? (
              <Skeleton className="h-64 w-full" />
            ) : previewQuery.isError || !previewQuery.data ? (
              <div className="flex min-h-48 flex-col items-center justify-center gap-2 text-center text-sm text-[var(--color-text-muted)]">
                <div className="flex items-center gap-2">
                  <XCircle
                    size={16}
                    className="shrink-0 text-[var(--color-danger)]"
                    aria-hidden="true"
                  />
                  Preview is unavailable for the current Company sender and template state.
                </div>
                <Button intent="navigation" onClick={() => void previewQuery.refetch()}>
                  Retry preview
                </Button>
              </div>
            ) : (
              <iframe
                title="Company email preview"
                sandbox=""
                srcDoc={previewQuery.data.html}
                className="h-80 w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)]"
              />
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Queue a test email</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <form
            noValidate
            onSubmit={handleSubmit((data) => void sendTest(data))}
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
          >
            <div className="min-w-0 flex-1">
              <Label htmlFor="company-email-test-recipient">Recipient email</Label>
              <Input
                id="company-email-test-recipient"
                type="email"
                aria-invalid={Boolean(testEmailErrors.recipientEmail)}
                {...register("recipientEmail")}
                placeholder="operator@example.com"
                className="mt-1"
                disabled={!canQueueTest || queueTestSend.isPending}
              />
              {testEmailErrors.recipientEmail && (
                <p className="mt-1 text-xs text-[var(--color-danger)]">
                  {testEmailErrors.recipientEmail.message}
                </p>
              )}
            </div>
            <Button
              intent="cta"
              type="submit"
              leadingIcon={<Send size={14} />}
              disabled={!canQueueTest || queueTestSend.isPending}
              isLoading={queueTestSend.isPending}
            >
              Queue test
            </Button>
          </form>
          <output className="mt-2 block text-xs text-[var(--color-text-muted)]">
            {effectivePreviewLocale ? (
              <>
                {fallbackCopy.requestedLocale}: {fallbackCopy.locales[activeLocale]}
                <span aria-hidden="true"> · </span>
                {fallbackCopy.effectiveLocale}: {fallbackCopy.locales[effectivePreviewLocale]}
              </>
            ) : (
              fallbackCopy.previewRequired
            )}
          </output>
          <p className="mt-2 text-xs text-[var(--color-text-muted)]">
            The test is clearly marked and queued through the transactional outbox. SMTP credentials
            are never exposed here.
          </p>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmation !== undefined}
        title={
          confirmation?.kind === "remove"
            ? "Remove template assignment?"
            : "Assign Template Variant?"
        }
        description={
          confirmation?.kind === "remove"
            ? "The Company will immediately return to its Company Default Template for this email type."
            : "The selected registered variant will become the effective Company template for this email type."
        }
        confirmLabel={confirmation?.kind === "remove" ? "Remove assignment" : "Assign variant"}
        isLoading={isMutating}
        onConfirm={() => void confirmChange()}
        onClose={() => setConfirmation(undefined)}
      />
    </div>
  );
}
