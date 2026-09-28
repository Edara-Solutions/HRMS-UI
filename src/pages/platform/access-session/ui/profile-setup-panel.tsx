import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { delegatedCompanyOperations as operations } from "@/shared/api";
import { usePreferencesStore } from "@/shared/config";
import { formatInstant } from "@/shared/lib/format-instant";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { QueryPanel } from "@/shared/ui/query-panel";
import { stepOperations } from "../api/access-session";
import {
  buildProfileUpdate,
  type DelegatedProfile,
  isProfileField,
  type ProfileFormValues,
  profileFields,
  profileFormSchema,
  toProfileForm,
} from "../model/profile";
import {
  availableCommands,
  type DelegatedSetupStep,
  isKnownStatus,
  orderSteps,
  type SetupCommand,
} from "../model/setup";
import type { AccessSessionWorkspace } from "../model/use-access-session-workspace";
import { useDelegatedCommand } from "../model/use-delegated-command";
import { CommandFeedback } from "./command-feedback";
import { TextField } from "./text-field";

const ltrFields = new Set(["email", "phone", "logoUrl"]);
const knownStepTypes = [
  "SET_COMPANY_PROFILE",
  "SET_BRANCHES",
  "SET_DEPARTMENTS",
  "SET_JOBS",
  "SET_ROLES",
  "SET_SHIFTS",
];

export function ProfileSetupPanel({ workspace }: { workspace: AccessSessionWorkspace }) {
  const { t } = useTranslation("platform-access-session");
  const profileReadable = workspace.availability(operations.profile).state === "enabled";
  const setupReadable = workspace.availability(operations.setup).state === "enabled";
  const { data, error, isPending, refetch } = useQuery({
    ...workspace.delegated.profile,
    enabled: profileReadable,
  });

  return (
    <div className="space-y-6">
      {profileReadable && (
        <QueryPanel
          title={t("profile.title")}
          pending={isPending}
          error={error}
          retry={() => void refetch()}
        >
          {data && <ProfileForm key={data.updatedAt} profile={data} workspace={workspace} />}
        </QueryPanel>
      )}
      {setupReadable && <SetupSteps workspace={workspace} />}
    </div>
  );
}

interface ProfileFormProps {
  profile: DelegatedProfile;
  workspace: AccessSessionWorkspace;
}

function ProfileForm({ profile, workspace }: ProfileFormProps) {
  const { t } = useTranslation("platform-access-session");
  const locale = usePreferencesStore((state) => state.locale);
  const command = useDelegatedCommand(workspace);
  const availability = workspace.availability(operations.updateProfile);
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: toProfileForm(profile),
  });
  const values = toProfileForm(profile);

  if (availability.state === "hidden")
    return (
      <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
        {profileFields.map((name) => (
          <div key={name} className="min-w-0 space-y-1">
            <dt className="text-xs text-[var(--color-text-muted)]">{t(`profile.field.${name}`)}</dt>
            <dd className="break-words text-sm" dir={ltrFields.has(name) ? "ltr" : undefined}>
              {values[name] || <span className="text-[var(--color-text-faint)]">–</span>}
            </dd>
          </div>
        ))}
      </dl>
    );

  const editable = availability.state === "enabled" && !command.pending;

  async function submit(formValues: ProfileFormValues) {
    const update = buildProfileUpdate(formValues, form.formState.dirtyFields);
    if (Object.keys(update).length === 0) return;
    await command.run(() => workspace.commands.updateProfile(update), {
      activity: "profileSaved",
      refresh: [workspace.delegated.profile.queryKey, workspace.delegated.setup.queryKey],
      onInvalid: (fields) => {
        for (const field of fields)
          if (isProfileField(field)) form.setError(field, { message: "rejected" });
      },
    });
  }

  return (
    <form noValidate className="grid gap-4 md:grid-cols-2" onSubmit={form.handleSubmit(submit)}>
      <div className="flex items-center gap-2 md:col-span-2">
        <Badge variant={profile.status === "COMPLETE" ? "success" : "warning"}>
          {t(`profile.status.${profile.status}`)}
        </Badge>
        <span className="text-xs text-[var(--color-text-muted)]">
          {t("profile.updatedAt", { date: formatInstant(profile.updatedAt, locale) })}
        </span>
      </div>
      {profileFields.map((name) => (
        <TextField
          key={name}
          id={`delegated-profile-${name}`}
          label={t(`profile.field.${name}`)}
          error={form.formState.errors[name]?.message}
          ltr={ltrFields.has(name)}
          disabled={!editable}
          registration={form.register(name)}
        />
      ))}
      <div className="flex flex-wrap items-center justify-between gap-3 md:col-span-2">
        <CommandFeedback feedback={command.feedback} />
        <Button
          type="submit"
          intent="cta"
          disabled={!editable || !form.formState.isDirty}
          isLoading={command.pending}
        >
          {t("profile.save")}
        </Button>
      </div>
    </form>
  );
}

interface PendingTransition {
  step: DelegatedSetupStep;
  command: SetupCommand;
}

function SetupSteps({ workspace }: { workspace: AccessSessionWorkspace }) {
  const { t } = useTranslation("platform-access-session");
  const { data, error, isPending, refetch } = useQuery(workspace.delegated.setup);
  const command = useDelegatedCommand(workspace);
  const [confirming, setConfirming] = useState<PendingTransition | null>(null);

  async function confirm() {
    if (!confirming) return;
    const { step, command: name } = confirming;
    await command.run(() => workspace.commands.transitionStep(name, step.publicId), {
      activity: "stepChanged",
      refresh: [workspace.delegated.setup.queryKey, workspace.delegated.profile.queryKey],
    });
    setConfirming(null);
  }

  return (
    <QueryPanel
      title={t("setup.title")}
      pending={isPending}
      error={error}
      retry={() => void refetch()}
    >
      <CommandFeedback feedback={command.feedback} />
      <ol className="divide-y divide-[var(--color-border)]">
        {data &&
          orderSteps(data).map((step) => (
            <li
              key={step.publicId}
              className="flex flex-wrap items-center justify-between gap-3 py-3"
            >
              <div className="min-w-0 space-y-1">
                <p className="font-medium">
                  {knownStepTypes.includes(step.stepType)
                    ? t(`setup.step.${step.stepType}`)
                    : t("setup.step.unknown")}
                </p>
                <p className="flex flex-wrap gap-2 text-xs text-[var(--color-text-muted)]">
                  <span>
                    {isKnownStatus(step.status)
                      ? t(`setup.status.${step.status}`)
                      : t("setup.status.unknown")}
                  </span>
                  <span>{step.isRequired ? t("setup.required") : t("setup.optional")}</span>
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {availableCommands(step).map((name) => {
                  const availability = workspace.availability(stepOperations[name]);
                  return availability.state === "hidden" ? null : (
                    <Button
                      key={name}
                      intent={name === "skip" ? "utility" : "action"}
                      disabled={availability.state !== "enabled" || command.pending}
                      onClick={() => setConfirming({ step, command: name })}
                    >
                      {t(`setup.command.${name}`)}
                    </Button>
                  );
                })}
              </div>
            </li>
          ))}
      </ol>
      <ConfirmDialog
        open={confirming !== null}
        tone="consequential"
        title={confirming ? t(`setup.confirm.${confirming.command}`) : ""}
        description={t("setup.confirmDescription")}
        confirmLabel={confirming ? t(`setup.command.${confirming.command}`) : ""}
        cancelLabel={t("cancel")}
        isLoading={command.pending}
        onClose={() => setConfirming(null)}
        onConfirm={() => void confirm()}
      />
    </QueryPanel>
  );
}
