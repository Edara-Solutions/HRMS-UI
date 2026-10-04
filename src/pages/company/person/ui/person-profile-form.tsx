import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useCompanyAccess, useCompanyMutationRecovery } from "@/shared/api";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { EnumSelect } from "@/shared/ui/enum-select";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { personQueries, personRoots, updatePerson } from "../api/person";
import {
  buildPersonUpdate,
  employmentTypes,
  isPersonField,
  type PersonFormValues,
  type PersonRecord,
  personFormSchema,
  personStatuses,
  toPersonForm,
  workLocations,
} from "../model/person";

const textFields = [
  "firstName",
  "lastName",
  "email",
  "employeeCode",
  "phone",
  "level",
  "hireDate",
] as const;
const ltrFields: readonly string[] = ["email", "employeeCode", "phone", "hireDate"];

interface Feedback {
  tone: "status" | "alert";
  message: string;
}

export function PersonProfileForm({ person }: { person: PersonRecord }) {
  const { t } = useTranslation("people");
  const access = useCompanyAccess();
  const recover = useCompanyMutationRecovery();
  const queryClient = useQueryClient();
  const userPublicId = access.user?.publicId ?? "";
  const availability = access.availability("PATCH /api/v1/company/users/{publicId}");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const form = useForm<PersonFormValues>({
    resolver: zodResolver(personFormSchema),
    // A server refresh replaces pristine fields but never discards an unsaved edit.
    values: toPersonForm(person),
    resetOptions: { keepDirtyValues: true },
  });
  const save = useMutation({
    retry: false,
    mutationFn: (body: ReturnType<typeof buildPersonUpdate>) => updatePerson(person.publicId, body),
    onSettled: () =>
      Promise.all(
        personRoots(userPublicId).map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      ),
  });
  const editable = availability.state === "enabled" && !save.isPending;

  async function submit(values: PersonFormValues) {
    setFeedback(null);
    const update = buildPersonUpdate(values, form.formState.dirtyFields);
    if (Object.keys(update).length === 0) {
      setFeedback({ tone: "status", message: t("person.noChanges") });
      return;
    }
    try {
      const saved = await save.mutateAsync(update);
      queryClient.setQueryData(personQueries(userPublicId, person.publicId).person.queryKey, saved);
      form.reset(toPersonForm(saved));
      setFeedback({ tone: "status", message: t("person.saved") });
    } catch (error) {
      const outcome = await recover(error);
      if (outcome.kind === "invalid")
        for (const field of outcome.fields)
          if (isPersonField(field)) form.setError(field, { message: "rejected" });
      setFeedback({ tone: "alert", message: t(`outcome.${outcome.kind}`) });
    }
  }

  if (availability.state === "hidden")
    return (
      <Card as="section" aria-labelledby="person-details">
        <CardHeader>
          <CardTitle id="person-details">{t("person.details")}</CardTitle>
        </CardHeader>
        <CardContent className="p-[18px]">
          <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
            {textFields.map((name) => (
              <div key={name} className="min-w-0 space-y-1">
                <dt className="text-xs text-[var(--color-text-muted)]">{t(`field.${name}`)}</dt>
                <dd className="break-words" dir={ltrFields.includes(name) ? "ltr" : undefined}>
                  {toPersonForm(person)[name] || t("person.notProvided")}
                </dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
    );

  return (
    <Card as="section" aria-labelledby="person-details">
      <CardHeader>
        <CardTitle id="person-details">{t("person.details")}</CardTitle>
      </CardHeader>
      <CardContent className="p-[18px]">
        <form noValidate className="grid gap-4 sm:grid-cols-2" onSubmit={form.handleSubmit(submit)}>
          {availability.state === "disabled" && (
            <p className="text-sm text-[var(--color-text-muted)] sm:col-span-2">
              {t(`restriction.${availability.reason}`)}
            </p>
          )}
          {textFields.map((name) => {
            const error = form.formState.errors[name]?.message;
            return (
              <div key={name} className="space-y-1.5">
                <Label htmlFor={`person-${name}`}>{t(`field.${name}`)}</Label>
                <Input
                  id={`person-${name}`}
                  type={name === "hireDate" ? "date" : name === "email" ? "email" : "text"}
                  dir={ltrFields.includes(name) ? "ltr" : undefined}
                  disabled={!editable}
                  aria-invalid={error !== undefined}
                  aria-describedby={error ? `person-${name}-error` : undefined}
                  {...form.register(name)}
                />
                {error && (
                  <p id={`person-${name}-error`} className="text-xs text-[var(--color-danger)]">
                    {t(`error.${error}`)}
                  </p>
                )}
              </div>
            );
          })}
          <div className="space-y-1.5">
            <Label htmlFor="person-status">{t("field.status")}</Label>
            <Controller
              control={form.control}
              name="status"
              render={({ field }) => (
                <EnumSelect
                  id="person-status"
                  value={field.value}
                  disabled={!editable}
                  options={personStatuses.map((value) => ({ value, label: t(`status.${value}`) }))}
                  onValueChange={field.onChange}
                />
              )}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="person-employmentType">{t("field.employmentType")}</Label>
            <Controller
              control={form.control}
              name="employmentType"
              render={({ field }) => (
                <EnumSelect
                  id="person-employmentType"
                  value={field.value ?? "NONE"}
                  disabled={!editable}
                  options={[
                    { value: "NONE", label: t("person.notSet") },
                    ...employmentTypes.map((value) => ({
                      value,
                      label: t(`employmentType.${value}`),
                    })),
                  ]}
                  onValueChange={(value) => field.onChange(value === "NONE" ? null : value)}
                />
              )}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="person-workLocation">{t("field.workLocation")}</Label>
            <Controller
              control={form.control}
              name="workLocation"
              render={({ field }) => (
                <EnumSelect
                  id="person-workLocation"
                  value={field.value ?? "NONE"}
                  disabled={!editable}
                  options={[
                    { value: "NONE", label: t("person.notSet") },
                    ...workLocations.map((value) => ({ value, label: t(`workLocation.${value}`) })),
                  ]}
                  onValueChange={(value) => field.onChange(value === "NONE" ? null : value)}
                />
              )}
            />
          </div>
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
