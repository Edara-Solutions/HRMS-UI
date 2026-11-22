import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { type FormEvent, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ContractViolation, OperationRefusal } from "@/shared/api";
import {
  type AudienceName,
  type CredentialSearch,
  safeReturnDestination,
  useAudienceSession,
  useCompanySession,
  usePlatformSession,
} from "@/shared/auth";
import { fieldErrorMap, passwordRuleHint, fieldErrors as toFieldErrors } from "@/shared/i18n";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { PasswordInput } from "@/shared/ui/password-input";
import { CredentialFrame, type CredentialLink } from "@/widgets/credential-frame";
import { type CredentialMode, loadCredentialService } from "../api/credential-service";

interface AudienceAuthPageProps {
  audience: AudienceName;
  mode: CredentialMode;
  search?: CredentialSearch;
}

interface CredentialField {
  name: string;
  type: "text" | "email" | "password";
  autoComplete: string;
}

function credentialFields(audience: AudienceName, mode: CredentialMode): CredentialField[] {
  if (mode === "login")
    return [
      ...(audience === "company"
        ? [
            { name: "companyCode", type: "text" as const, autoComplete: "organization" },
            { name: "employeeCode", type: "text" as const, autoComplete: "username" },
          ]
        : [{ name: "email", type: "email" as const, autoComplete: "username" }]),
      { name: "password", type: "password", autoComplete: "current-password" },
    ];
  if (mode === "recovery")
    return [
      ...(audience === "company"
        ? [{ name: "companyCode", type: "text" as const, autoComplete: "organization" }]
        : []),
      { name: "email", type: "email", autoComplete: "email" },
    ];
  return [
    { name: "newPassword", type: "password", autoComplete: "new-password" },
    { name: "confirmPassword", type: "password", autoComplete: "new-password" },
  ];
}

export function AudienceAuthPage({ audience, mode, search = {} }: AudienceAuthPageProps) {
  const { t } = useTranslation("auth");
  const navigate = useNavigate();
  const state = useAudienceSession(audience);
  const [feedback, setFeedback] = useState<string | null>(() =>
    search.localSignOutOnly ? t("journey.localOnlySignOut") : null,
  );
  const [completed, setCompleted] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const linkIncomplete =
    (mode === "invitation" || mode === "reset") &&
    (!search.token || (audience === "company" && !search.companyPublicId));
  const service = useQuery({
    queryKey: [audience, "credential-service"],
    queryFn: () => loadCredentialService(audience),
    staleTime: Infinity,
    retry: false,
  });
  const action = useMutation({
    retry: false,
    mutationFn: async (input: unknown) => {
      if (!service.data) throw new Error("Credentials unavailable");
      if (mode === "login") return service.data.signIn(input);
      if (mode === "invitation") return service.data.acceptInvitation(input);
      if (mode === "recovery") return service.data.requestRecovery(input);
      return service.data.confirmRecovery(input);
    },
  });
  const occupancyAction = useMutation({
    retry: false,
    mutationFn: async (choice: "continue" | "sign-out") => {
      if (!service.data) throw new Error("Credentials unavailable");
      if (choice === "continue") {
        await service.data.revalidate();
        const current =
          audience === "company" ? useCompanySession.getState() : usePlatformSession.getState();
        if (current.status !== "authenticated" && current.status !== "must_change_password")
          throw new Error("Session unavailable");
        await navigate({
          href:
            current.status === "must_change_password"
              ? `/${audience}/change-password`
              : safeReturnDestination(audience, search.returnTo),
        });
      } else {
        const result = await service.data.signOut();
        setFeedback(
          t(result.remoteConfirmed ? "journey.localAndRemoteSignOut" : "journey.localOnlySignOut"),
        );
      }
    },
    onError: () => setFeedback(t("journey.unavailable")),
  });

  useEffect(() => {
    if (mode !== "login" || !state.session) return;
    if (state.status === "hydrating" && service.data) {
      void service.data.revalidate().catch(() => setFeedback(t("journey.unavailable")));
    } else if (state.status === "authenticated" || state.status === "must_change_password") {
      void navigate({
        href:
          state.status === "must_change_password"
            ? `/${audience}/change-password`
            : safeReturnDestination(audience, search.returnTo),
      });
    }
  }, [audience, mode, navigate, search.returnTo, service.data, state.session, state.status, t]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!service.data || action.isPending) return;
    setFeedback(null);
    const input: Record<string, unknown> = Object.fromEntries(new FormData(event.currentTarget));
    if (mode === "login" || mode === "invitation") input.clientType = "web";
    if (mode === "invitation" || mode === "reset") {
      if (input.newPassword !== input.confirmPassword) {
        setFieldErrors({ confirmPassword: t("journey.passwordMismatch") });
        setFeedback(t("journey.checkFields"));
        return;
      }
      delete input.confirmPassword;
      input.token = search.token ?? "";
      if (audience === "company") input.companyPublicId = search.companyPublicId ?? "";
    }
    const parsed = service.data.schemas[mode].safeParse(input, { errorMap: fieldErrorMap(t) });
    if (!parsed.success) {
      const errors = toFieldErrors(
        parsed.error.issues,
        new Set(credentialFields(audience, mode).map((field) => field.name)),
      );
      setFieldErrors(errors);
      setFeedback(
        t(Object.keys(errors).length > 0 ? "journey.checkFields" : "journey.invalidLinkOrFields"),
      );
      return;
    }
    setFieldErrors({});
    try {
      const result = await action.mutateAsync(parsed.data);
      if (result) {
        await navigate({
          href: result.user.mustChangePassword
            ? `/${audience}/change-password`
            : safeReturnDestination(audience, search.returnTo),
        });
      } else {
        setCompleted(true);
        setFeedback(t(mode === "recovery" ? "journey.recoverySent" : "journey.resetComplete"));
      }
    } catch (error) {
      setFeedback(
        t(
          error instanceof OperationRefusal && error.status === 429
            ? "journey.rateLimited"
            : error instanceof ContractViolation
              ? "journey.unavailable"
              : mode === "login"
                ? "journey.signInFailed"
                : "journey.notCompleted",
        ),
      );
    }
  }

  const pending = action.isPending || occupancyAction.isPending;
  const links: CredentialLink[] = [
    mode === "login"
      ? {
          to: audience === "company" ? "/company/forgot-password" : "/platform/forgot-password",
          label: t("journey.recoveryTitle"),
        }
      : {
          to: audience === "company" ? "/company/login" : "/platform/login",
          label: t("journey.loginTitle"),
        },
    ...(audience === "company" ? [{ to: "/plans", label: t("journey.publicPlans") }] : []),
  ];
  return (
    <CredentialFrame
      audience={audience}
      title={t(`journey.${mode}Title`)}
      description={t(`journey.${mode}Description`)}
      links={links}
    >
      <div className="space-y-5">
        {feedback ? (
          <p
            role="status"
            className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4 text-sm"
          >
            {feedback}
          </p>
        ) : null}
        {service.isPending ? (
          <p role="status" className="text-sm">
            {t("journey.loading")}
          </p>
        ) : service.isError ? (
          <Button onClick={() => void service.refetch()}>{t("journey.retry")}</Button>
        ) : state.session ? (
          <div className="space-y-4">
            <p className="text-sm">{t("journey.occupied")}</p>
            <div className="flex flex-wrap gap-2">
              <Button
                intent="cta"
                disabled={pending}
                onClick={() => occupancyAction.mutate("continue")}
              >
                {t("journey.continue")}
              </Button>
              <Button
                intent="action"
                disabled={pending}
                onClick={() => occupancyAction.mutate("sign-out")}
              >
                {t("journey.signOutAudience", { audience: t(`journey.${audience}`) })}
              </Button>
            </div>
          </div>
        ) : linkIncomplete ? (
          <p
            role="status"
            className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4 text-sm"
          >
            {t("journey.invalidLink")}
          </p>
        ) : !completed ? (
          <form
            noValidate
            onSubmit={(event) => void submit(event)}
            className="space-y-5"
            aria-busy={pending}
          >
            {credentialFields(audience, mode).map((field) => {
              const error = fieldErrors[field.name];
              const hint = passwordRuleHint(t, service.data?.schemas[mode], field.name);
              const describedBy = [
                hint ? `credential-${field.name}-hint` : null,
                error ? `credential-${field.name}-error` : null,
              ].filter(Boolean);
              const validity = {
                "aria-invalid": Boolean(error),
                "aria-describedby": describedBy.length > 0 ? describedBy.join(" ") : undefined,
              };
              return (
                <div key={field.name} className="space-y-1.5">
                  <Label htmlFor={`credential-${field.name}`}>{t(`journey.${field.name}`)}</Label>
                  {field.type === "password" ? (
                    <PasswordInput
                      id={`credential-${field.name}`}
                      name={field.name}
                      required
                      maxLength={128}
                      autoComplete={field.autoComplete}
                      {...validity}
                      disabled={pending}
                    />
                  ) : (
                    <Input
                      id={`credential-${field.name}`}
                      name={field.name}
                      type={field.type}
                      required
                      maxLength={
                        field.name === "companyCode" ? 10 : field.name === "employeeCode" ? 50 : 255
                      }
                      autoComplete={field.autoComplete}
                      {...validity}
                      disabled={pending}
                    />
                  )}
                  {hint ? (
                    <p
                      id={`credential-${field.name}-hint`}
                      className="text-xs text-[var(--color-text-muted)]"
                    >
                      {hint}
                    </p>
                  ) : null}
                  {error ? (
                    <p
                      id={`credential-${field.name}-error`}
                      className="text-xs text-[var(--color-danger)]"
                    >
                      {error}
                    </p>
                  ) : null}
                </div>
              );
            })}
            <Button type="submit" intent="cta" size="block" disabled={pending} isLoading={pending}>
              {t(`journey.${mode}Action`)}
            </Button>
          </form>
        ) : null}
      </div>
    </CredentialFrame>
  );
}
