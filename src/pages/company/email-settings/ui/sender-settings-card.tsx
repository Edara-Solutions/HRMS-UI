import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useCompanyAccess, useCompanyMutationRecovery } from "@/shared/api";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { EnumSelect } from "@/shared/ui/enum-select";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { emailSettingsQueries, emailSettingsRoots, saveEmailSettings } from "../api/email-settings";
import {
  type EmailSettings,
  type EmailSettingsFormValues,
  emailSettingsFields,
  emailSettingsFormSchema,
  toEmailSettingsBody,
  toEmailSettingsForm,
} from "../model/email-settings";

const ltrFields: readonly string[] = [
  "senderLocalPart",
  "replyToEmail",
  "logoUrl",
  "primaryColor",
  "onPrimaryColor",
  "defaultTimeZone",
];

function isSettingsField(name: string): name is (typeof emailSettingsFields)[number] {
  return emailSettingsFields.some((field) => field === name);
}

export function SenderSettingsCard({ settings }: { settings: EmailSettings }) {
  const { t } = useTranslation("communications");
  const access = useCompanyAccess();
  const recover = useCompanyMutationRecovery();
  const queryClient = useQueryClient();
  const userPublicId = access.user?.publicId ?? "";
  const availability = access.availability("PUT /api/v1/company/email-settings");
  const [feedback, setFeedback] = useState<{ tone: "status" | "alert"; message: string } | null>(
    null,
  );
  const form = useForm<EmailSettingsFormValues>({
    resolver: zodResolver(emailSettingsFormSchema),
    values: toEmailSettingsForm(settings),
    resetOptions: { keepDirtyValues: true },
  });
  const save = useMutation({
    retry: false,
    mutationFn: saveEmailSettings,
    onSettled: () =>
      Promise.all(
        emailSettingsRoots(userPublicId).map((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        ),
      ),
  });
  const editable = availability.state === "enabled" && !save.isPending;
  const sender = `${settings.senderLocalPart}@${settings.sendingDomain ?? t("settings.noDomain")}`;

  async function submit(values: EmailSettingsFormValues) {
    setFeedback(null);
    try {
      const saved = await save.mutateAsync(toEmailSettingsBody(values));
      queryClient.setQueryData(emailSettingsQueries(userPublicId).settings.queryKey, saved);
      form.reset(toEmailSettingsForm(saved));
      setFeedback({ tone: "status", message: t("settings.saved") });
    } catch (error) {
      const outcome = await recover(error);
      if (outcome.kind === "invalid")
        for (const field of outcome.fields)
          if (isSettingsField(field)) form.setError(field, { message: "invalid" });
      setFeedback({ tone: "alert", message: t(`outcome.${outcome.kind}`) });
    }
  }

  return (
    <Card as="section" aria-labelledby="sender-settings" className="min-w-0">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle id="sender-settings">{t("settings.title")}</CardTitle>
          <Badge variant={settings.senderVerified ? "success" : "warning"}>
            {settings.senderVerified
              ? t("settings.senderVerified")
              : t("settings.senderUnverified")}
          </Badge>
        </div>
        <p className="mt-2 break-all text-xs text-[var(--color-text-muted)]" dir="ltr">
          {sender}
        </p>
      </CardHeader>
      <CardContent className="p-[18px]">
        {availability.state === "hidden" ? (
          <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            {emailSettingsFields.map((name) => (
              <div key={name} className="min-w-0 space-y-1">
                <dt className="text-xs text-[var(--color-text-muted)]">
                  {t(`settings.field.${name}`)}
                </dt>
                <dd className="break-words" dir={ltrFields.includes(name) ? "ltr" : undefined}>
                  {toEmailSettingsForm(settings)[name] || t("settings.notSet")}
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <form
            noValidate
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={form.handleSubmit(submit)}
          >
            {availability.state === "disabled" && (
              <p className="text-sm text-[var(--color-text-muted)] sm:col-span-2">
                {t(`restriction.${availability.reason}`)}
              </p>
            )}
            {emailSettingsFields.map((name) => {
              const error = form.formState.errors[name];
              return (
                <div key={name} className="space-y-1.5">
                  <Label htmlFor={`email-${name}`}>{t(`settings.field.${name}`)}</Label>
                  <Input
                    id={`email-${name}`}
                    dir={ltrFields.includes(name) ? "ltr" : undefined}
                    disabled={!editable}
                    aria-invalid={error !== undefined}
                    aria-describedby={error ? `email-${name}-error` : undefined}
                    {...form.register(name)}
                  />
                  {error && (
                    <p id={`email-${name}-error`} className="text-xs text-[var(--color-danger)]">
                      {t("error.invalid")}
                    </p>
                  )}
                </div>
              );
            })}
            <div className="space-y-1.5">
              <Label htmlFor="email-defaultLocale">{t("settings.field.defaultLocale")}</Label>
              <Controller
                control={form.control}
                name="defaultLocale"
                render={({ field }) => (
                  <EnumSelect
                    id="email-defaultLocale"
                    value={field.value}
                    disabled={!editable}
                    options={[
                      { value: "en", label: t("locale.en") },
                      { value: "ar", label: t("locale.ar") },
                    ]}
                    onValueChange={field.onChange}
                  />
                )}
              />
            </div>
            <div className="flex justify-end border-t border-[var(--color-border)] pt-4 sm:col-span-2">
              {availability.state === "enabled" && (
                <Button
                  type="submit"
                  intent="cta"
                  leadingIcon={<Save aria-hidden="true" size={15} />}
                  isLoading={save.isPending}
                  disabled={save.isPending}
                >
                  {t("settings.save")}
                </Button>
              )}
            </div>
            <p
              role={feedback?.tone === "alert" ? "alert" : "status"}
              className="min-h-5 text-sm sm:col-span-2"
            >
              {feedback?.message}
            </p>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
