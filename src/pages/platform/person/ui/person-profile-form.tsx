import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { usePlatformAccess, usePlatformMutationRecovery } from "@/shared/api";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { personQueries, personRoots, updatePerson } from "../api/person";
import {
  buildProfileUpdate,
  isProfileField,
  type PersonRecord,
  type ProfileField,
  type ProfileFormValues,
  profileFormSchema,
  toProfileForm,
} from "../model/person";

const fields: readonly ProfileField[] = [
  "firstName",
  "lastName",
  "staffCode",
  "jobTitle",
  "team",
  "startedAt",
  "locale",
  "timezone",
];
const ltrFields: readonly ProfileField[] = ["staffCode", "startedAt", "locale", "timezone"];

interface Feedback {
  tone: "status" | "alert";
  message: string;
}

interface PersonProfileFormProps {
  person: PersonRecord;
}

/** Safe staff-profile fields only; email is shown but is never part of this form. */
export function PersonProfileForm({ person }: PersonProfileFormProps) {
  const { t } = useTranslation("platform-people");
  const access = usePlatformAccess();
  const recover = usePlatformMutationRecovery();
  const queryClient = useQueryClient();
  const userPublicId = access.user?.publicId ?? "";
  const availability = access.availability("PATCH /api/v1/platform/users/{publicId}");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    // A server refresh replaces pristine fields but never discards an unsaved edit.
    values: toProfileForm(person),
    resetOptions: { keepDirtyValues: true },
  });
  const save = useMutation({
    retry: false,
    mutationFn: (body: ReturnType<typeof buildProfileUpdate>) =>
      updatePerson(person.publicId, body),
    onSettled: () =>
      Promise.all(
        personRoots(userPublicId).map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      ),
  });
  const editable = availability.state === "enabled" && !save.isPending;

  async function submit(values: ProfileFormValues) {
    setFeedback(null);
    const update = buildProfileUpdate(values, form.formState.dirtyFields);
    if (Object.keys(update).length === 0) {
      setFeedback({ tone: "status", message: t("person.noChanges") });
      return;
    }
    try {
      const saved = await save.mutateAsync(update);
      queryClient.setQueryData(personQueries(userPublicId, person.publicId).person.queryKey, saved);
      form.reset(toProfileForm(saved));
      setFeedback({ tone: "status", message: t("person.saved") });
    } catch (error) {
      const outcome = await recover(error);
      if (outcome.kind === "invalid")
        for (const field of outcome.fields)
          if (isProfileField(field)) form.setError(field, { message: "rejected" });
      setFeedback({ tone: "alert", message: t(`outcome.${outcome.kind}`) });
    }
  }

  const email = (
    <div className="min-w-0 space-y-1 sm:col-span-2">
      <p className="text-xs text-[var(--color-text-muted)]">{t("field.email")}</p>
      <p className="break-all text-sm" dir="ltr">
        {person.email}
      </p>
    </div>
  );

  if (availability.state === "hidden")
    return (
      <Card as="section" aria-labelledby="platform-person-details">
        <CardHeader>
          <CardTitle id="platform-person-details">{t("person.details")}</CardTitle>
        </CardHeader>
        <CardContent className="p-[18px]">
          <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
            {email}
            {fields.map((name) => (
              <div key={name} className="min-w-0 space-y-1">
                <dt className="text-xs text-[var(--color-text-muted)]">{t(`field.${name}`)}</dt>
                <dd className="break-words" dir={ltrFields.includes(name) ? "ltr" : undefined}>
                  {toProfileForm(person)[name] || t("state.notProvided")}
                </dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
    );

  return (
    <Card as="section" aria-labelledby="platform-person-details">
      <CardHeader>
        <CardTitle id="platform-person-details">{t("person.details")}</CardTitle>
      </CardHeader>
      <CardContent className="p-[18px]">
        <form noValidate className="grid gap-4 sm:grid-cols-2" onSubmit={form.handleSubmit(submit)}>
          {email}
          {availability.state === "disabled" && (
            <p className="text-sm text-[var(--color-text-muted)] sm:col-span-2">
              {t(`restriction.${availability.reason}`)}
            </p>
          )}
          {fields.map((name) => {
            const error = form.formState.errors[name]?.message;
            return (
              <div key={name} className="space-y-1.5">
                <Label htmlFor={`platform-person-${name}`}>{t(`field.${name}`)}</Label>
                <Input
                  id={`platform-person-${name}`}
                  type={name === "startedAt" ? "date" : "text"}
                  dir={ltrFields.includes(name) ? "ltr" : undefined}
                  disabled={!editable}
                  aria-invalid={error !== undefined}
                  aria-describedby={error ? `platform-person-${name}-error` : undefined}
                  {...form.register(name)}
                />
                {error && (
                  <p
                    id={`platform-person-${name}-error`}
                    className="text-xs text-[var(--color-danger)]"
                  >
                    {t(`error.${error}`)}
                  </p>
                )}
              </div>
            );
          })}
          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[var(--color-border)] pt-4 sm:col-span-2">
            {availability.state === "enabled" && (
              <Button
                type="submit"
                intent="cta"
                leadingIcon={<Save aria-hidden="true" size={15} />}
                isLoading={save.isPending}
                disabled={save.isPending}
              >
                {t("person.save")}
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
      </CardContent>
    </Card>
  );
}
