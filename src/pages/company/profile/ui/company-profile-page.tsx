import { zodResolver } from "@hookform/resolvers/zod";
import { HTTPError } from "ky";
import { AlertCircle, CheckCircle2, RefreshCw, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useCurrentSession } from "@/shared/auth";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import {
  type CompanyProfile,
  type ProfileFieldName,
  profileFieldNames,
  type RequiredProfileFieldName,
  requiredProfileFieldNames,
  type UpdateCompanyProfileInput,
  useCompanyProfile,
  useCompanySetupChecklist,
  useUpdateCompanyProfile,
} from "../api/company-profile";
import { buildProfileUpdate, type CompanyProfileFormValues } from "../model/company-profile-update";

const formSchema = z.object({
  name: z.string().trim().min(1, "Company name is required."),
  logoUrl: z.string().trim().url("Enter a valid logo URL.").or(z.literal("")),
  email: z.string().trim().email("Enter a valid email address.").or(z.literal("")),
  phone: z.string(),
  country: z.string(),
  city: z.string(),
  addressLine: z.string(),
  taxNumber: z.string(),
  commercialNumber: z.string(),
});

type FormValues = z.infer<typeof formSchema> & CompanyProfileFormValues;

interface TextFieldConfig {
  name: ProfileFieldName;
  label: string;
  autoComplete?: string;
  optional?: boolean;
}

interface BackendValidationError {
  error?: string;
  fieldErrors?: Partial<Record<ProfileFieldName, string | string[]>>;
  details?: Partial<Record<ProfileFieldName, string | string[]>>;
}

const fieldConfigs: TextFieldConfig[] = [
  { name: "name", label: "Company name", autoComplete: "organization" },
  { name: "email", label: "Email", autoComplete: "email" },
  { name: "phone", label: "Phone", autoComplete: "tel" },
  { name: "country", label: "Country", autoComplete: "country-name" },
  { name: "city", label: "City", autoComplete: "address-level2" },
  { name: "logoUrl", label: "Logo URL", autoComplete: "url", optional: true },
  { name: "taxNumber", label: "Tax number", optional: true },
  { name: "commercialNumber", label: "Commercial number", optional: true },
];

const requiredFieldLabels: Record<RequiredProfileFieldName, string> = {
  name: "Name",
  email: "Email",
  phone: "Phone",
  country: "Country",
  city: "City",
  addressLine: "Address line",
};

function toFormValues(profile: CompanyProfile): FormValues {
  return {
    name: profile.name,
    logoUrl: profile.logoUrl ?? "",
    email: profile.email ?? "",
    phone: profile.phone ?? "",
    country: profile.country ?? "",
    city: profile.city ?? "",
    addressLine: profile.addressLine ?? "",
    taxNumber: profile.taxNumber ?? "",
    commercialNumber: profile.commercialNumber ?? "",
  };
}

function hasUpdates(input: UpdateCompanyProfileInput) {
  return Object.keys(input).length > 0;
}

function isValidationPayload(value: unknown): value is BackendValidationError {
  return value !== null && typeof value === "object";
}

function getFieldMessage(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}

async function readProfileError(error: unknown) {
  if (!(error instanceof HTTPError)) {
    return { message: "Unable to save the profile. Please try again.", isAmbiguous: false };
  }

  let payload: unknown = null;
  try {
    payload = await error.response.clone().json();
  } catch {
    payload = null;
  }

  const backendMessage =
    isValidationPayload(payload) && typeof payload.error === "string"
      ? payload.error
      : "Unable to save the profile. Please try again.";
  const fieldErrors =
    isValidationPayload(payload) && payload.fieldErrors
      ? payload.fieldErrors
      : isValidationPayload(payload) && payload.details
        ? payload.details
        : undefined;

  return {
    message: backendMessage,
    fieldErrors,
    isAmbiguous: error.response.status >= 500,
  };
}

export function CompanyProfilePage() {
  const session = useCurrentSession();
  const companyPublicId = session?.user.companyPublicId ?? null;
  const profileQuery = useCompanyProfile(companyPublicId);
  const setupQuery = useCompanySetupChecklist(companyPublicId);
  const updateProfile = useUpdateCompanyProfile();
  const [message, setMessage] = useState("");
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      logoUrl: "",
      email: "",
      phone: "",
      country: "",
      city: "",
      addressLine: "",
      taxNumber: "",
      commercialNumber: "",
    },
  });

  useEffect(() => {
    if (profileQuery.data) {
      form.reset(toFormValues(profileQuery.data));
    }
  }, [form, profileQuery.data]);

  const profile = profileQuery.data;
  const formValues = form.watch();
  const profileStep = useMemo(
    () =>
      setupQuery.data?.steps
        .slice()
        .sort((left, right) => left.sequence - right.sequence)
        .find((step) => step.stepType === "SET_COMPANY_PROFILE") ?? null,
    [setupQuery.data],
  );

  async function submit(values: FormValues) {
    if (!companyPublicId) return;
    form.clearErrors();
    setMessage("");
    const input = buildProfileUpdate(
      values,
      form.formState.dirtyFields as Partial<Record<ProfileFieldName, boolean>>,
    );

    if (!hasUpdates(input)) {
      setMessage("No profile changes to save.");
      return;
    }

    try {
      const savedProfile = await updateProfile.mutateAsync({ companyPublicId, input });
      form.reset(toFormValues(savedProfile));
      setMessage(
        savedProfile.status === "COMPLETE"
          ? "Profile saved. Continue with the remaining setup checklist."
          : "Profile saved. Add the required fields to complete this setup step.",
      );
    } catch (error) {
      const profileError = await readProfileError(error);
      if (profileError.fieldErrors) {
        for (const name of profileFieldNames) {
          const fieldMessage = getFieldMessage(profileError.fieldErrors[name]);
          if (fieldMessage) form.setError(name, { message: fieldMessage });
        }
      }
      if (profileError.isAmbiguous) {
        await Promise.all([profileQuery.refetch(), setupQuery.refetch()]);
        setMessage(`${profileError.message} Profile and setup state were reloaded before retry.`);
        return;
      }
      form.setError("root", { message: profileError.message });
    }
  }

  if (!companyPublicId) {
    return (
      <Card>
        <EmptyState
          icon={AlertCircle}
          title="Company context unavailable"
          description="Sign in as the company owner to complete the company profile."
        />
      </Card>
    );
  }

  if (profileQuery.isPending) {
    return (
      <Card>
        <EmptyState icon={RefreshCw} title="Loading profile" description="Fetching company data." />
      </Card>
    );
  }

  if (profileQuery.isError || !profile) {
    return (
      <Card>
        <EmptyState
          icon={AlertCircle}
          title="Profile unavailable"
          description="The profile could not be loaded for this company."
        />
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-[var(--color-text)]">
            Company profile
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Complete the owner-managed profile for {profile.name}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant={profile.status === "COMPLETE" ? "success" : "warning"}>
            {profile.status === "COMPLETE" ? "Complete" : "Incomplete"}
          </Badge>
          {profileStep && (
            <Badge variant={profileStep.status === "COMPLETED" ? "success" : "default"}>
              Setup: {profileStep.status.toLowerCase().replaceAll("_", " ")}
            </Badge>
          )}
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Card>
          <CardHeader>
            <CardTitle>Profile details</CardTitle>
          </CardHeader>
          <CardContent className="p-[18px]">
            <form className="grid gap-4 md:grid-cols-2" onSubmit={form.handleSubmit(submit)}>
              {form.formState.errors.root?.message && (
                <div
                  className="md:col-span-2 flex items-start gap-2 rounded-[var(--radius-md)] border border-[color-mix(in_srgb,var(--color-danger)_55%,var(--color-border))] bg-[var(--color-danger-soft)] px-3 py-2.5 text-sm text-[var(--color-danger)]"
                  role="alert"
                >
                  <AlertCircle aria-hidden="true" className="mt-0.5 shrink-0" size={16} />
                  <p>{form.formState.errors.root.message}</p>
                </div>
              )}

              {fieldConfigs.map(({ name, label, autoComplete, optional }) => (
                <div className="space-y-1.5" key={name}>
                  <Label htmlFor={name}>{optional ? `${label} (optional)` : label}</Label>
                  <Input
                    id={name}
                    autoComplete={autoComplete}
                    disabled={updateProfile.isPending}
                    {...form.register(name)}
                    aria-invalid={Boolean(form.formState.errors[name])}
                    aria-describedby={form.formState.errors[name] ? `${name}-error` : undefined}
                  />
                  <p
                    className="min-h-4 text-xs text-[var(--color-danger)]"
                    id={`${name}-error`}
                    role={form.formState.errors[name] ? "alert" : undefined}
                  >
                    {form.formState.errors[name]?.message}
                  </p>
                </div>
              ))}

              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="addressLine">Address line</Label>
                <Textarea
                  id="addressLine"
                  rows={3}
                  autoComplete="street-address"
                  disabled={updateProfile.isPending}
                  {...form.register("addressLine")}
                  aria-invalid={Boolean(form.formState.errors.addressLine)}
                  aria-describedby={
                    form.formState.errors.addressLine ? "addressLine-error" : undefined
                  }
                />
                <p
                  className="min-h-4 text-xs text-[var(--color-danger)]"
                  id="addressLine-error"
                  role={form.formState.errors.addressLine ? "alert" : undefined}
                >
                  {form.formState.errors.addressLine?.message}
                </p>
              </div>

              <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] pt-4">
                <p className="text-xs text-[var(--color-text-muted)]">
                  Last updated {new Date(profile.updatedAt).toLocaleString()}
                </p>
                <Button
                  type="submit"
                  intent="cta"
                  leadingIcon={<Save size={15} />}
                  isLoading={updateProfile.isPending}
                  disabled={updateProfile.isPending}
                >
                  Save profile
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Completion</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-[18px] text-sm">
              <p className="text-[var(--color-text-muted)]">
                Name, email, phone, country, city, and address line complete the profile. Logo and
                legal identifiers are optional.
              </p>
              <div className="space-y-2">
                {requiredProfileFieldNames.map((name) => {
                  const isPresent = formValues[name].trim().length > 0;
                  return (
                    <div className="flex items-center gap-2" key={name}>
                      <CheckCircle2
                        aria-hidden="true"
                        size={16}
                        className={
                          isPresent
                            ? "text-[var(--color-success)]"
                            : "text-[var(--color-text-faint)]"
                        }
                      />
                      <span className="text-[var(--color-text)]">{requiredFieldLabels[name]}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Setup sync</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-[18px] text-sm text-[var(--color-text-muted)]">
              {setupQuery.isPending ? (
                <p>Loading checklist state.</p>
              ) : profileStep ? (
                <>
                  <p>
                    The profile setup step is{" "}
                    {profileStep.status.toLowerCase().replaceAll("_", " ")}.
                  </p>
                  <p>Checklist state reloads after every profile save.</p>
                </>
              ) : (
                <p>No profile setup row is available for this company.</p>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>

      {message && (
        <p
          role="status"
          className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-3 text-sm"
        >
          {message}
        </p>
      )}
    </div>
  );
}
