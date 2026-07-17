import { zodResolver } from "@hookform/resolvers/zod";
import { HTTPError } from "ky";
import { AlertCircle, CheckCircle2, Mail, RefreshCw } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { readBackendErrorMessage } from "@/shared/api";
import { hasPermission, useCurrentSession } from "@/shared/auth";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
  type UpdateCompanyEmailSettings,
  useCompanyEmailReadiness,
  useCompanyEmailSettings,
  useUpdateCompanyEmailSettings,
} from "../api/company-email-settings";

const formSchema = z.object({
  displayName: z.string().min(1, "Enter a sender name"),
  logoUrl: z.string().url("Enter a valid logo URL").or(z.literal("")),
  primaryColor: z.string().regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Use a hex color"),
  onPrimaryColor: z.string().regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Use a hex color"),
  footerIdentity: z.string().min(1, "Enter footer identity"),
  senderLocalPart: z
    .string()
    .regex(/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/i, "Use a valid sender local-part"),
  replyToEmail: z.string().email("Enter a valid reply-to address"),
  defaultLocale: z.enum(["en", "ar"]),
  defaultTimeZone: z.string().min(1, "Enter an IANA timezone"),
});
type FormValues = z.infer<typeof formSchema>;

const textFields = [
  { name: "displayName", label: "Sender name" },
  { name: "logoUrl", label: "Logo URL" },
  { name: "primaryColor", label: "Primary color" },
  { name: "onPrimaryColor", label: "Text on primary" },
  { name: "footerIdentity", label: "Footer identity" },
  { name: "senderLocalPart", label: "From local-part" },
  { name: "replyToEmail", label: "Reply-to address" },
  { name: "defaultTimeZone", label: "Default timezone" },
] as const;

const toUpdateInput = ({ logoUrl, ...values }: FormValues): UpdateCompanyEmailSettings => ({
  ...values,
  ...(logoUrl ? { logoUrl } : {}),
});

export function CompanyEmailSettingsPage() {
  const session = useCurrentSession();
  const companyPublicId = session?.user.companyPublicId ?? null;
  const canUpdate = hasPermission(session?.user, "companies:email-settings:update");
  const settings = useCompanyEmailSettings(companyPublicId);
  const readiness = useCompanyEmailReadiness(companyPublicId);
  const update = useUpdateCompanyEmailSettings();
  const form = useForm<FormValues>({ resolver: zodResolver(formSchema) });

  useEffect(() => {
    if (settings.data) form.reset({ ...settings.data, logoUrl: settings.data.logoUrl ?? "" });
  }, [form, settings.data]);
  if (!companyPublicId)
    return (
      <p className="text-sm text-[var(--color-text-muted)]">
        Company email settings are not available for this session.
      </p>
    );
  const domainReady = settings.data?.senderVerified === true;
  const editDisabled = !domainReady || settings.isLoading || !canUpdate;
  const submit = async (values: FormValues) => {
    form.clearErrors("root");
    try {
      await update.mutateAsync({
        companyPublicId,
        input: toUpdateInput(values),
      });
    } catch (error) {
      const message =
        error instanceof HTTPError ? await readBackendErrorMessage(error.response) : undefined;
      form.setError("root", {
        message: message ?? "Unable to save email settings. Please try again.",
      });
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="text-[26px] font-bold tracking-tight text-[var(--color-text)]">
          Email settings
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Manage your Company’s email identity and defaults. Delivery infrastructure remains managed
          by Edara.
        </p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Readiness</CardTitle>
        </CardHeader>
        <CardContent className="p-[18px]">
          <div className="flex gap-3 text-sm">
            {readiness.data?.ready ? (
              <CheckCircle2 className="shrink-0 text-[var(--color-success)]" size={18} />
            ) : (
              <AlertCircle className="shrink-0 text-[var(--color-warning)]" size={18} />
            )}
            <div>
              <p className="font-medium text-[var(--color-text)]">
                {readiness.data?.ready
                  ? "Ready to send Company email"
                  : "Email setup needs attention"}
              </p>
              <p className="mt-1 text-[var(--color-text-muted)]">
                {readiness.data?.ready
                  ? `Verified sender domain: ${settings.data?.sendingDomain}`
                  : readiness.data?.reason === "NOT_PROVISIONED"
                    ? "Ask an Edara operator to provision your sending domain. DNS verification is controlled by your operator."
                    : "Complete the verification guidance from your Edara operator, then refresh this page."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Brand and sender preferences</CardTitle>
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
            {textFields.map(({ name, label }) => (
              <div className="space-y-1.5" key={name}>
                <Label htmlFor={name}>{label}</Label>
                <Input
                  id={name}
                  disabled={editDisabled}
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
            <div className="space-y-1.5">
              <Label htmlFor="defaultLocale">Default language</Label>
              <select
                id="defaultLocale"
                className="h-9 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
                disabled={editDisabled}
                {...form.register("defaultLocale")}
                aria-invalid={Boolean(form.formState.errors.defaultLocale)}
                aria-describedby={
                  form.formState.errors.defaultLocale ? "defaultLocale-error" : undefined
                }
              >
                <option value="en">English</option>
                <option value="ar">العربية</option>
              </select>
              <p
                className="min-h-4 text-xs text-[var(--color-danger)]"
                id="defaultLocale-error"
                role={form.formState.errors.defaultLocale ? "alert" : undefined}
              >
                {form.formState.errors.defaultLocale?.message}
              </p>
            </div>
            <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] pt-4">
              <p className="text-xs text-[var(--color-text-muted)]">
                <Mail className="me-1 inline" size={13} />
                {!canUpdate
                  ? "You have view-only access to these email settings."
                  : domainReady
                    ? `From: ${form.watch("senderLocalPart") || "no-reply"}@${settings.data?.sendingDomain}`
                    : "A verified sending domain is required before these settings can be saved."}
              </p>
              <Button
                type="submit"
                intent="cta"
                isLoading={update.isPending}
                disabled={editDisabled}
              >
                Save email settings
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <Button
        intent="utility"
        leadingIcon={<RefreshCw size={15} />}
        onClick={() => {
          void Promise.all([settings.refetch(), readiness.refetch()]);
        }}
      >
        Refresh status
      </Button>
    </div>
  );
}
