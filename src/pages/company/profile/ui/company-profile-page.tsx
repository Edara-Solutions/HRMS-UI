import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, Circle, Save } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import {
  ContractViolation,
  classifyMutationFailure,
  isCompanyBlocked,
  OperationRefusal,
  useCompanyAccess,
} from "@/shared/api";
import { usePreferencesStore } from "@/shared/config";
import { formatInstant } from "@/shared/lib/format-instant";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { CompanyAccessNotice } from "@/shared/ui/company-access-notice";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Skeleton } from "@/shared/ui/skeleton";
import { Textarea } from "@/shared/ui/textarea";
import { companyProfileQueries, updateOrganizationProfile } from "../api/company-profile";
import {
  buildProfileUpdate,
  isProfileFieldName,
  type OrganizationProfile,
  type ProfileFieldName,
  type ProfileFormValues,
  profileFieldNames,
  profileFormSchema,
  requiredProfileFieldNames,
  toFormValues,
} from "../model/company-profile-update";

const autoComplete: Partial<Record<ProfileFieldName, string>> = {
  name: "organization",
  email: "email",
  phone: "tel",
  country: "country-name",
  city: "address-level2",
  addressLine: "street-address",
  logoUrl: "url",
};

const ltrFields: readonly ProfileFieldName[] = ["email", "phone", "logoUrl"];

interface Feedback {
  tone: "status" | "alert";
  message: string;
}

export function CompanyProfilePage() {
  const { t } = useTranslation("organization");
  const access = useCompanyAccess();
  const queries = companyProfileQueries(access.user?.publicId ?? "");
  const { data, error, isPending, isError, refetch } = useQuery({
    ...queries.profile,
    enabled: access.user !== undefined,
  });

  if (isCompanyBlocked(error)) throw error;
  if (error instanceof OperationRefusal && [403, 404].includes(error.status)) throw error;
  if (!access.user) return null;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">{t("profile.pageTitle")}</h1>
          <p className="max-w-2xl text-sm leading-6 text-[var(--color-text-muted)]">
            {t("profile.pageDescription")}{" "}
            <Link
              to="/company/me/profile"
              className="font-medium text-[var(--color-primary)] underline-offset-4 hover:underline"
            >
              {t("profile.personalLink")}
            </Link>
          </p>
        </div>
        {data && (
          <Badge variant={data.status === "COMPLETE" ? "success" : "warning"}>
            {t(`profile.status.${data.status}`)}
          </Badge>
        )}
      </header>

      {access.policy && <CompanyAccessNotice {...access.policy} />}

      {isPending ? (
        <output className="block space-y-3" aria-label={t("state.loading")}>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </output>
      ) : isError ? (
        <div className="space-y-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] p-4 text-sm">
          <p>
            {error instanceof ContractViolation
              ? t("state.contractUnavailable")
              : t("state.loadFailed")}
          </p>
          {!(error instanceof ContractViolation) && (
            <Button intent="action" size="sm" onClick={() => void refetch()}>
              {t("state.retry")}
            </Button>
          )}
        </div>
      ) : (
        <ProfileWorkspace profile={data} />
      )}
    </div>
  );
}

function ProfileWorkspace({ profile }: { profile: OrganizationProfile }) {
  const { t } = useTranslation("organization");
  const locale = usePreferencesStore((state) => state.locale);
  const access = useCompanyAccess();
  const queryClient = useQueryClient();
  const queries = companyProfileQueries(access.user?.publicId ?? "");
  const availability = access.availability("PATCH /api/v1/company/profile");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    // Server refreshes replace pristine fields but never discard an unsaved edit.
    values: toFormValues(profile),
    resetOptions: { keepDirtyValues: true },
  });
  const save = useMutation({
    mutationFn: updateOrganizationProfile,
    retry: false,
    // A save can change setup, activation and the registry name, confirmed or not.
    onSettled: () =>
      Promise.all(
        [queries.setup, queries.activation, queries.registry].map(({ queryKey }) =>
          queryClient.invalidateQueries({ queryKey }),
        ),
      ),
  });
  const editable = availability.state === "enabled" && !save.isPending;
  const values = form.watch();

  async function submit(formValues: ProfileFormValues) {
    setFeedback(null);
    const update = buildProfileUpdate(formValues, form.formState.dirtyFields);
    if (Object.keys(update).length === 0) {
      setFeedback({ tone: "status", message: t("profile.noChanges") });
      return;
    }
    try {
      const saved = await save.mutateAsync(update);
      queryClient.setQueryData(queries.profile.queryKey, saved);
      form.reset(toFormValues(saved));
      setFeedback({
        tone: "status",
        message: t(
          saved.status === "COMPLETE" ? "profile.savedComplete" : "profile.savedIncomplete",
        ),
      });
    } catch (error) {
      const outcome = classifyMutationFailure(error);
      if (outcome.kind === "invalid") {
        for (const field of outcome.fields)
          if (isProfileFieldName(field)) form.setError(field, { message: "rejected" });
        setFeedback({ tone: "alert", message: t("profile.invalid") });
        return;
      }
      if (outcome.kind === "access-restricted") await access.recordRefusedMode(outcome.mode);
      await queryClient.invalidateQueries({ queryKey: queries.profile.queryKey });
      setFeedback({
        tone: "alert",
        message:
          outcome.kind === "access-restricted"
            ? t("profile.restricted")
            : outcome.kind === "contract"
              ? t("state.contractUnavailable")
              : outcome.kind === "refused"
                ? t("profile.refused")
                : outcome.kind === "stale"
                  ? t("profile.stale")
                  : t("profile.uncertain"),
      });
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
      <Card as="section" aria-labelledby="profile-details" className="min-w-0">
        <CardHeader>
          <CardTitle id="profile-details">{t("profile.detailsTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="p-[18px]">
          {availability.state === "hidden" ? (
            <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              {profileFieldNames.map((name) => (
                <div key={name} className="min-w-0 space-y-1">
                  <dt className="text-xs text-[var(--color-text-muted)]">
                    {t(`profile.field.${name}`)}
                  </dt>
                  <dd
                    className="break-words text-sm"
                    dir={ltrFields.includes(name) ? "ltr" : undefined}
                  >
                    {toFormValues(profile)[name] || t("profile.notProvided")}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <form
              noValidate
              className="grid gap-4 md:grid-cols-2"
              onSubmit={form.handleSubmit(submit)}
            >
              {availability.state === "disabled" && (
                <p className="text-sm text-[var(--color-text-muted)] md:col-span-2">
                  {t(`restriction.${availability.reason}`)}
                </p>
              )}
              {profileFieldNames.map((name) => {
                const error = form.formState.errors[name]?.message;
                const errorId = `${name}-error`;
                const control = {
                  id: name,
                  autoComplete: autoComplete[name],
                  dir: ltrFields.includes(name) ? "ltr" : undefined,
                  disabled: !editable,
                  "aria-invalid": error !== undefined,
                  "aria-describedby": error ? errorId : undefined,
                  ...form.register(name),
                };
                return (
                  <div
                    key={name}
                    className={name === "addressLine" ? "space-y-1.5 md:col-span-2" : "space-y-1.5"}
                  >
                    <Label htmlFor={name}>
                      {t(`profile.field.${name}`)}
                      {!requiredProfileFieldNames.some((field) => field === name) &&
                        ` ${t("profile.optional")}`}
                    </Label>
                    {name === "addressLine" ? (
                      <Textarea rows={3} {...control} />
                    ) : (
                      <Input {...control} />
                    )}
                    {error && (
                      <p id={errorId} className="text-xs text-[var(--color-danger)]">
                        {t(`profile.error.${error}`)}
                      </p>
                    )}
                  </div>
                );
              })}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] pt-4 md:col-span-2">
                <p className="text-xs text-[var(--color-text-muted)]">
                  {t("profile.updatedAt", { date: formatInstant(profile.updatedAt, locale) })}
                </p>
                {availability.state === "enabled" && (
                  <Button
                    type="submit"
                    intent="cta"
                    leadingIcon={<Save aria-hidden="true" size={15} />}
                    isLoading={save.isPending}
                    disabled={save.isPending}
                  >
                    {t("profile.save")}
                  </Button>
                )}
              </div>
              <p
                role={feedback?.tone === "alert" ? "alert" : "status"}
                className="min-h-5 text-sm md:col-span-2"
              >
                {feedback?.message}
              </p>
            </form>
          )}
        </CardContent>
      </Card>

      <Card as="section" aria-labelledby="profile-completion" className="h-fit">
        <CardHeader>
          <CardTitle id="profile-completion">{t("profile.completionTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-[18px] text-sm">
          <p className="text-[var(--color-text-muted)]">{t("profile.completionDescription")}</p>
          <ul className="space-y-2">
            {requiredProfileFieldNames.map((name) => {
              const present = values[name].trim().length > 0;
              return (
                <li key={name} className="flex items-center gap-2">
                  {present ? (
                    <CheckCircle2
                      aria-hidden="true"
                      size={16}
                      className="text-[var(--color-success)]"
                    />
                  ) : (
                    <Circle
                      aria-hidden="true"
                      size={16}
                      className="text-[var(--color-text-faint)]"
                    />
                  )}
                  <span>{t(`profile.field.${name}`)}</span>
                  <span className="sr-only">
                    {present ? t("profile.provided") : t("profile.notProvided")}
                  </span>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
