import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, Mail, PauseCircle, PlayCircle, RefreshCw, ShieldCheck } from "lucide-react";
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
import { Label } from "@/shared/ui/label";
import { Skeleton } from "@/shared/ui/skeleton";
import { Textarea } from "@/shared/ui/textarea";
import {
  type EmailContext,
  type SendingContextStatus,
  usePauseSending,
  useResumeSending,
  useSendingStatus,
} from "../api/email-sending";
import { type EmailSendingCopy, getEmailSendingCopy } from "../model/email-sending-copy";

const CONTEXT_ORDER = ["EDARA", "COMPANY"] as const satisfies readonly EmailContext[];

// The backend caps the reason at 500 chars; matching it here keeps the hard limit off the server.
const REASON_MAX_LENGTH = 500;

const PAUSE_FORM_SCHEMA = z.object({
  reason: z.string().trim().min(1).max(REASON_MAX_LENGTH),
});

type PauseFormData = z.infer<typeof PAUSE_FORM_SCHEMA>;

/** The per-context presentation: its localized label, description, and icon. One place to add a
 * third context, rather than a branch repeated at every use site. */
function contextMeta(context: EmailContext, copy: EmailSendingCopy) {
  return context === "EDARA"
    ? { label: copy.edaraContext, description: copy.edaraDescription, Icon: ShieldCheck }
    : { label: copy.companyContext, description: copy.companyDescription, Icon: Building2 };
}

// Intl formatters are expensive to build, so cache one per locale rather than per render.
const changedAtFormatters = new Map<SupportedLocale, Intl.DateTimeFormat>();

function formatChangedAt(iso: string, locale: SupportedLocale): string {
  let formatter = changedAtFormatters.get(locale);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });
    changedAtFormatters.set(locale, formatter);
  }
  return formatter.format(new Date(iso));
}

interface SendingDialogProps {
  context: EmailContext;
  copy: EmailSendingCopy;
  open: boolean;
  onClose: () => void;
}

function PauseDialog({ context, copy, open, onClose }: SendingDialogProps) {
  const { titleId, descriptionId } = useDialogIds();
  const pause = usePauseSending();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PauseFormData>({
    resolver: zodResolver(PAUSE_FORM_SCHEMA),
    defaultValues: { reason: "" },
  });

  function close() {
    reset();
    pause.reset();
    onClose();
  }

  async function submit({ reason }: PauseFormData) {
    await pause.mutateAsync({ context, reason });
    close();
  }

  return (
    <Dialog
      open={open}
      onClose={close}
      dismissible={!pause.isPending}
      titleId={titleId}
      descriptionId={descriptionId}
      className="max-w-md"
    >
      <DialogTitle id={titleId}>{copy.pauseTitle}</DialogTitle>
      <DialogDescription id={descriptionId}>{copy.pauseDialogDescription}</DialogDescription>

      <form
        noValidate
        className="mt-4 flex flex-col gap-2"
        onSubmit={handleSubmit((d) => void submit(d))}
      >
        <Label htmlFor="email-sending-pause-reason">{copy.reasonLabel}</Label>
        <Textarea
          id="email-sending-pause-reason"
          rows={3}
          maxLength={REASON_MAX_LENGTH}
          placeholder={copy.pauseReasonPlaceholder}
          disabled={pause.isPending}
          aria-invalid={Boolean(errors.reason)}
          aria-describedby={errors.reason ? "email-sending-pause-reason-error" : undefined}
          {...register("reason")}
        />
        {errors.reason ? (
          <p id="email-sending-pause-reason-error" className="text-xs text-[var(--color-danger)]">
            {copy.reasonRequired}
          </p>
        ) : null}
        {pause.isError ? (
          <p className="text-xs text-[var(--color-danger)]" role="alert">
            {copy.actionFailed}
          </p>
        ) : null}

        <div className="mt-4 flex items-center justify-end gap-2">
          <Button type="button" intent="dismissive" onClick={close} disabled={pause.isPending}>
            {copy.cancel}
          </Button>
          <Button
            type="submit"
            intent="destructive"
            disabled={pause.isPending}
            isLoading={pause.isPending}
          >
            {copy.confirmPause}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function ResumeDialog({ context, copy, open, onClose }: SendingDialogProps) {
  const { titleId, descriptionId } = useDialogIds();
  const resume = useResumeSending();

  function close() {
    resume.reset();
    onClose();
  }

  async function confirm() {
    await resume.mutateAsync(context);
    close();
  }

  return (
    <Dialog
      open={open}
      onClose={close}
      dismissible={!resume.isPending}
      titleId={titleId}
      descriptionId={descriptionId}
      className="max-w-sm"
    >
      <DialogTitle id={titleId}>{copy.resumeTitle}</DialogTitle>
      <DialogDescription id={descriptionId}>{copy.resumeDialogDescription}</DialogDescription>
      {resume.isError ? (
        <p className="mt-3 text-xs text-[var(--color-danger)]" role="alert">
          {copy.actionFailed}
        </p>
      ) : null}
      <div className="mt-6 flex items-center justify-end gap-2">
        <Button intent="dismissive" onClick={close} disabled={resume.isPending}>
          {copy.cancel}
        </Button>
        <Button
          onClick={() => void confirm()}
          disabled={resume.isPending}
          isLoading={resume.isPending}
        >
          {copy.confirmResume}
        </Button>
      </div>
    </Dialog>
  );
}

interface SendingContextCardProps {
  status: SendingContextStatus;
  copy: EmailSendingCopy;
  displayLocale: SupportedLocale;
}

function SendingContextCard({ status, copy, displayLocale }: SendingContextCardProps) {
  const [pauseOpen, setPauseOpen] = useState(false);
  const [resumeOpen, setResumeOpen] = useState(false);
  const { Icon, label, description } = contextMeta(status.context, copy);

  return (
    <Card
      as="section"
      aria-labelledby={`sending-${status.context}-title`}
      className="flex min-h-[236px] flex-col overflow-hidden"
    >
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-4">
        <div className="flex min-w-0 gap-3">
          <span className={cardIconClass(status.paused)} aria-hidden="true">
            <Icon size={16} />
          </span>
          <div className="min-w-0">
            <CardTitle id={`sending-${status.context}-title`}>{label}</CardTitle>
            <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-muted)]">
              {description}
            </p>
          </div>
        </div>
        <Badge variant={status.paused ? "warning" : "success"}>
          {status.paused ? copy.paused : copy.active}
        </Badge>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-5 p-[18px]">
        <p className="text-xs leading-relaxed text-[var(--color-text-muted)]">
          {status.paused ? copy.pausedDescription : copy.activeDescription}
        </p>

        {status.paused ? (
          <dl className="space-y-2 rounded-[var(--radius-md)] border border-[color-mix(in_srgb,var(--color-warning)_45%,var(--color-border))] bg-[var(--color-warning-soft)] p-3">
            {status.reason ? (
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-faint)]">
                  {copy.reasonLabel}
                </dt>
                <dd className="mt-0.5 text-xs text-[var(--color-text)]">
                  <bdi dir="auto">{status.reason}</bdi>
                </dd>
              </div>
            ) : null}
            {status.updatedAt ? (
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-faint)]">
                  {copy.updatedAt}
                </dt>
                <dd className="mt-0.5 text-xs tabular-nums text-[var(--color-text-muted)]">
                  {formatChangedAt(status.updatedAt, displayLocale)}
                  {status.updatedBy !== null ? (
                    <>
                      {" · "}
                      {copy.user} #{status.updatedBy}
                    </>
                  ) : null}
                </dd>
              </div>
            ) : null}
          </dl>
        ) : null}

        <div className="mt-auto flex justify-end border-t border-[var(--color-border)] pt-4">
          {status.paused ? (
            <Button
              intent="action"
              leadingIcon={<PlayCircle size={16} aria-hidden="true" />}
              onClick={() => setResumeOpen(true)}
            >
              {copy.resumeAction}
            </Button>
          ) : (
            <Button
              intent="destructive-trigger"
              leadingIcon={<PauseCircle size={16} aria-hidden="true" />}
              onClick={() => setPauseOpen(true)}
            >
              {copy.pauseAction}
            </Button>
          )}
        </div>
      </CardContent>

      <PauseDialog
        context={status.context}
        copy={copy}
        open={pauseOpen}
        onClose={() => setPauseOpen(false)}
      />
      <ResumeDialog
        context={status.context}
        copy={copy}
        open={resumeOpen}
        onClose={() => setResumeOpen(false)}
      />
    </Card>
  );
}

function cardIconClass(paused: boolean): string {
  return cn(
    "flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-md)]",
    paused
      ? "bg-[var(--color-warning-soft)] text-[var(--color-warning)]"
      : "bg-[var(--color-primary-soft)] text-[var(--color-primary)]",
  );
}

/** Platform Admin emergency pause/resume controls for each communication context (PRD story 110). */
export function AdminEmailSendingPage() {
  const displayLocale = usePreferencesStore((state) => state.locale);
  const copy = getEmailSendingCopy(displayLocale);
  const status = useSendingStatus();
  const byContext = new Map(status.data?.items.map((item) => [item.context, item]));

  return (
    <div className="mx-auto max-w-5xl space-y-7">
      <header className="max-w-2xl border-b border-[var(--color-border)] pb-6">
        <div className="mb-2 flex items-center gap-2 text-xs font-medium text-[var(--color-primary)]">
          <Mail size={14} aria-hidden="true" />
          {copy.breadcrumb}
        </div>
        <h1 className="text-[26px] font-bold tracking-tight text-[var(--color-text)]">
          {copy.title}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-[var(--color-text-muted)]">
          {copy.pageDescription}
        </p>
      </header>

      {status.isPending ? (
        <div className="grid gap-5 md:grid-cols-2" role="status" aria-label={copy.loadingStatus}>
          <Skeleton className="h-52" />
          <Skeleton className="h-52" />
        </div>
      ) : null}

      {status.isError ? (
        <Card className="p-8 text-center" role="alert">
          <p className="text-sm font-semibold text-[var(--color-text)]">{copy.statusUnavailable}</p>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            {copy.statusUnavailableDescription}
          </p>
          <Button
            intent="action"
            size="sm"
            className="mt-4"
            leadingIcon={<RefreshCw size={14} aria-hidden="true" />}
            onClick={() => void status.refetch()}
          >
            {copy.retry}
          </Button>
        </Card>
      ) : null}

      {status.data ? (
        <section className="grid gap-5 md:grid-cols-2" aria-label={copy.title}>
          {CONTEXT_ORDER.map((context) => {
            const item = byContext.get(context);
            return item ? (
              <SendingContextCard
                key={context}
                status={item}
                copy={copy}
                displayLocale={displayLocale}
              />
            ) : null;
          })}
        </section>
      ) : null}
    </div>
  );
}
