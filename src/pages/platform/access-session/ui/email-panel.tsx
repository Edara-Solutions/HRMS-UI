import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { OperationRefusal, delegatedCompanyOperations as operations } from "@/shared/api";
import { usePreferencesStore } from "@/shared/config";
import { formatInstant } from "@/shared/lib/format-instant";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { EnumSelect } from "@/shared/ui/enum-select";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { QueryPanel } from "@/shared/ui/query-panel";
import {
  type AssignmentFormValues,
  assignmentFormSchema,
  type DelegatedEmailSettings,
  type EmailSettingsFormValues,
  emailLocales,
  emailSettingsFields,
  emailSettingsFormSchema,
  isEmailSettingsField,
  toEmailSettingsBody,
  toEmailSettingsForm,
} from "../model/email";
import type { AccessSessionWorkspace } from "../model/use-access-session-workspace";
import { useDelegatedCommand } from "../model/use-delegated-command";
import { CommandFeedback } from "./command-feedback";
import { EmailDiagnosticsPanel } from "./email-diagnostics-panel";
import { TextField } from "./text-field";

const ltrSettings = new Set([
  "senderLocalPart",
  "replyToEmail",
  "logoUrl",
  "primaryColor",
  "onPrimaryColor",
  "defaultTimeZone",
]);
const knownDomainStatuses = ["PENDING", "VERIFIED", "FAILED"];
const knownDomainHealth = ["HEALTHY", "UNHEALTHY", "UNKNOWN"];

interface PanelProps {
  workspace: AccessSessionWorkspace;
}

export function EmailPanel({ workspace }: PanelProps) {
  const granted = (operation: { key: string }) =>
    workspace.availability(operation).state === "enabled";
  return (
    <div className="space-y-6">
      <EmailDiagnosticsPanel workspace={workspace} />
      {granted(operations.emailSettings) && <EmailSettingsSection workspace={workspace} />}
      <div className="grid gap-6 lg:grid-cols-2">
        {granted(operations.emailReadiness) && <ReadinessSection workspace={workspace} />}
        {granted(operations.sendingDomain) && <SendingDomainSection workspace={workspace} />}
      </div>
      {granted(operations.templateAssignments) && <AssignmentsSection workspace={workspace} />}
    </div>
  );
}

function EmailSettingsSection({ workspace }: PanelProps) {
  const { t } = useTranslation("platform-access-session");
  const { data, error, isPending, refetch } = useQuery(workspace.delegated.emailSettings);
  return (
    <QueryPanel
      title={t("email.settingsTitle")}
      pending={isPending}
      error={error}
      retry={() => void refetch()}
    >
      {data && (
        <EmailSettingsForm key={JSON.stringify(data)} settings={data} workspace={workspace} />
      )}
    </QueryPanel>
  );
}

interface EmailSettingsFormProps extends PanelProps {
  settings: DelegatedEmailSettings;
}

function EmailSettingsForm({ settings, workspace }: EmailSettingsFormProps) {
  const { t } = useTranslation("platform-access-session");
  const command = useDelegatedCommand(workspace);
  const availability = workspace.availability(operations.updateEmailSettings);
  const form = useForm<EmailSettingsFormValues>({
    resolver: zodResolver(emailSettingsFormSchema),
    defaultValues: toEmailSettingsForm(settings),
  });
  const editable = availability.state === "enabled" && !command.pending;
  const sender = settings.sendingDomain
    ? `${settings.senderLocalPart}@${settings.sendingDomain}`
    : t("email.noDomain");

  async function submit(values: EmailSettingsFormValues) {
    await command.run(() => workspace.commands.updateEmailSettings(toEmailSettingsBody(values)), {
      activity: "emailSettingsSaved",
      refresh: [
        workspace.delegated.emailSettings.queryKey,
        workspace.delegated.emailReadiness.queryKey,
      ],
      onInvalid: (fields) => {
        for (const field of fields)
          if (isEmailSettingsField(field)) form.setError(field, { message: "rejected" });
      },
    });
  }

  return (
    <form noValidate className="grid gap-4 md:grid-cols-2" onSubmit={form.handleSubmit(submit)}>
      <p className="flex flex-wrap items-center gap-2 text-sm md:col-span-2">
        <span className="text-[var(--color-text-muted)]">{t("email.sender")}</span>
        <span dir="ltr">{sender}</span>
        <Badge variant={settings.senderVerified ? "success" : "warning"}>
          {settings.senderVerified ? t("email.senderVerified") : t("email.senderUnverified")}
        </Badge>
      </p>
      {emailSettingsFields.map((name) => {
        const error = form.formState.errors[name]?.message;
        return (
          <TextField
            key={name}
            id={`delegated-email-${name}`}
            label={t(`email.field.${name}`)}
            error={error && (error === "rejected" ? error : "invalid")}
            ltr={ltrSettings.has(name)}
            disabled={!editable}
            registration={form.register(name)}
          />
        );
      })}
      <div className="space-y-1.5">
        <Label htmlFor="delegated-email-defaultLocale">{t("email.field.defaultLocale")}</Label>
        <Controller
          control={form.control}
          name="defaultLocale"
          render={({ field }) => (
            <EnumSelect
              id="delegated-email-defaultLocale"
              value={field.value}
              disabled={!editable}
              options={emailLocales.map((value) => ({ value, label: t(`email.locale.${value}`) }))}
              onValueChange={field.onChange}
            />
          )}
        />
      </div>
      {availability.state !== "hidden" && (
        <div className="flex flex-wrap items-center justify-between gap-3 md:col-span-2">
          <CommandFeedback feedback={command.feedback} />
          <Button
            type="submit"
            intent="cta"
            disabled={!editable || !form.formState.isDirty}
            isLoading={command.pending}
          >
            {t("email.save")}
          </Button>
        </div>
      )}
    </form>
  );
}

function ReadinessSection({ workspace }: PanelProps) {
  const { t } = useTranslation("platform-access-session");
  const { data, error, isPending, refetch } = useQuery(workspace.delegated.emailReadiness);
  return (
    <QueryPanel
      title={t("email.readinessTitle")}
      pending={isPending}
      error={error}
      retry={() => void refetch()}
    >
      {data && (
        <p className="flex items-center gap-2 text-sm">
          <Badge variant={data.ready ? "success" : "warning"}>
            {data.ready ? t("email.ready") : t("email.notReady")}
          </Badge>
        </p>
      )}
    </QueryPanel>
  );
}

function SendingDomainSection({ workspace }: PanelProps) {
  const { t } = useTranslation("platform-access-session");
  const locale = usePreferencesStore((state) => state.locale);
  const { data, error, isPending, refetch } = useQuery(workspace.delegated.sendingDomain);
  const missing = error instanceof OperationRefusal && error.status === 404;
  return (
    <QueryPanel
      title={t("email.domainTitle")}
      pending={isPending}
      error={missing ? undefined : error}
      retry={() => void refetch()}
    >
      {missing && <p className="text-sm text-[var(--color-text-muted)]">{t("email.noDomain")}</p>}
      {data && (
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div className="space-y-0.5">
            <dt className="text-xs text-[var(--color-text-muted)]">{t("email.domain")}</dt>
            <dd dir="ltr">{data.domain}</dd>
          </div>
          <div className="space-y-0.5">
            <dt className="text-xs text-[var(--color-text-muted)]">{t("email.domainStatus")}</dt>
            <dd>
              {knownDomainStatuses.includes(data.status)
                ? t(`email.domainState.${data.status}`)
                : t("email.domainState.unknown")}
            </dd>
          </div>
          <div className="space-y-0.5">
            <dt className="text-xs text-[var(--color-text-muted)]">{t("email.domainHealth")}</dt>
            <dd>
              {knownDomainHealth.includes(data.health)
                ? t(`email.health.${data.health}`)
                : t("email.health.unknown")}
            </dd>
          </div>
          <div className="space-y-0.5">
            <dt className="text-xs text-[var(--color-text-muted)]">{t("email.verifiedAt")}</dt>
            <dd>{data.verifiedAt ? formatInstant(data.verifiedAt, locale) : t("notProvided")}</dd>
          </div>
          {data.lastFailure !== null && (
            <p className="text-xs text-[var(--color-text-muted)] sm:col-span-2">
              {t("email.lastFailureRecorded")}
            </p>
          )}
        </dl>
      )}
    </QueryPanel>
  );
}

function AssignmentsSection({ workspace }: PanelProps) {
  const { t } = useTranslation("platform-access-session");
  const { data, error, isPending, refetch } = useQuery(workspace.delegated.templateAssignments);
  const command = useDelegatedCommand(workspace);
  const [removing, setRemoving] = useState<string | null>(null);
  const assign = workspace.availability(operations.assignTemplate);
  const remove = workspace.availability(operations.unassignTemplate);
  const form = useForm<AssignmentFormValues>({
    resolver: zodResolver(assignmentFormSchema),
    defaultValues: { emailTypeKey: "", templateRevisionKey: "" },
  });
  const refresh = [workspace.delegated.templateAssignments.queryKey];

  async function submit(values: AssignmentFormValues) {
    const saved = await command.run(() => workspace.commands.assignTemplate(values), {
      activity: "templateAssigned",
      refresh,
    });
    if (saved) form.reset();
  }

  async function confirmRemoval() {
    if (!removing) return;
    const emailTypeKey = removing;
    await command.run(() => workspace.commands.unassignTemplate(emailTypeKey), {
      activity: "templateRemoved",
      refresh,
    });
    setRemoving(null);
  }

  return (
    <QueryPanel
      title={t("email.assignmentsTitle")}
      pending={isPending}
      error={error}
      retry={() => void refetch()}
    >
      {data?.items.length === 0 && (
        <p className="text-sm text-[var(--color-text-muted)]">{t("email.noAssignments")}</p>
      )}
      <ul className="divide-y divide-[var(--color-border)]">
        {data?.items.map((assignment) => (
          <li
            key={assignment.emailTypeKey}
            className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm"
          >
            <span dir="ltr" className="font-mono text-xs">
              {assignment.emailTypeKey} → {assignment.templateRevisionKey}
            </span>
            {remove.state !== "hidden" && (
              <Button
                intent="utility"
                disabled={remove.state !== "enabled" || command.pending}
                aria-label={t("email.removeNamed", { key: assignment.emailTypeKey })}
                onClick={() => setRemoving(assignment.emailTypeKey)}
              >
                {t("email.remove")}
              </Button>
            )}
          </li>
        ))}
      </ul>
      {assign.state !== "hidden" && (
        <form
          noValidate
          className="grid gap-3 border-t border-[var(--color-border)] pt-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
          onSubmit={form.handleSubmit(submit)}
        >
          {(["emailTypeKey", "templateRevisionKey"] as const).map((name) => (
            <div key={name} className="space-y-1.5">
              <Label htmlFor={`delegated-assignment-${name}`}>{t(`email.field.${name}`)}</Label>
              <Input
                id={`delegated-assignment-${name}`}
                dir="ltr"
                disabled={assign.state !== "enabled" || command.pending}
                aria-invalid={form.formState.errors[name] !== undefined}
                {...form.register(name)}
              />
            </div>
          ))}
          <Button
            type="submit"
            intent="action"
            disabled={assign.state !== "enabled"}
            isLoading={command.pending}
          >
            {t("email.assign")}
          </Button>
        </form>
      )}
      <CommandFeedback feedback={command.feedback} />
      <ConfirmDialog
        open={removing !== null}
        tone="destructive"
        title={t("email.removeTitle")}
        description={t("email.removeDescription", { key: removing ?? "" })}
        confirmLabel={t("email.remove")}
        cancelLabel={t("cancel")}
        isLoading={command.pending}
        onClose={() => setRemoving(null)}
        onConfirm={() => void confirmRemoval()}
      />
    </QueryPanel>
  );
}
