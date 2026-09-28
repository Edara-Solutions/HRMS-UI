import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
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
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { PasswordInput } from "@/shared/ui/password-input";
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
  const [invalidFields, setInvalidFields] = useState<string[]>([]);
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
        setInvalidFields(["confirmPassword"]);
        setFeedback(t("journey.passwordMismatch"));
        return;
      }
      delete input.confirmPassword;
      input.token = search.token ?? "";
      if (audience === "company") input.companyPublicId = search.companyPublicId ?? "";
    }
    const parsed = service.data.schemas[mode].safeParse(input);
    if (!parsed.success) {
      setInvalidFields(parsed.error.issues.map((issue) => String(issue.path[0] ?? "")));
      setFeedback(
        t(
          mode === "invitation" || mode === "reset"
            ? "journey.invalidLinkOrFields"
            : "journey.checkFields",
        ),
      );
      return;
    }
    setInvalidFields([]);
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
                ? "journey.invalidCredentials"
                : "journey.notCompleted",
        ),
      );
    }
  }

  const pending = action.isPending || occupancyAction.isPending;
  return (
    <section
      className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10 sm:px-6"
      aria-labelledby="credential-heading"
    >
      <p className="text-sm font-medium text-[var(--color-text-muted)]">
        {t(`journey.${audience}`)}
      </p>
      <h1 id="credential-heading" className="mt-2 text-2xl font-semibold tracking-tight">
        {t(`journey.${mode}Title`)}
      </h1>
      <p className="mt-3 text-sm text-[var(--color-text-muted)]">
        {t(`journey.${mode}Description`)}
      </p>
      {feedback ? (
        <p
          role="status"
          className="mt-5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm"
        >
          {feedback}
        </p>
      ) : null}
      {service.isPending ? (
        <p role="status" className="mt-6 text-sm">
          {t("journey.loading")}
        </p>
      ) : service.isError ? (
        <Button className="mt-6" onClick={() => void service.refetch()}>
          {t("journey.retry")}
        </Button>
      ) : state.session ? (
        <div className="mt-6 space-y-4">
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
      ) : !completed ? (
        <form
          onSubmit={(event) => void submit(event)}
          className="mt-7 space-y-5"
          aria-busy={pending}
        >
          {credentialFields(audience, mode).map((field) => (
            <div key={field.name} className="space-y-1.5">
              <Label htmlFor={`credential-${field.name}`}>{t(`journey.${field.name}`)}</Label>
              {field.type === "password" ? (
                <PasswordInput
                  id={`credential-${field.name}`}
                  name={field.name}
                  required
                  maxLength={128}
                  autoComplete={field.autoComplete}
                  aria-invalid={invalidFields.includes(field.name)}
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
                  aria-invalid={invalidFields.includes(field.name)}
                  disabled={pending}
                />
              )}
              {invalidFields.includes(field.name) ? (
                <p className="text-xs text-[var(--color-danger)]">{t("journey.invalidField")}</p>
              ) : null}
            </div>
          ))}
          <Button type="submit" intent="cta" size="block" disabled={pending} isLoading={pending}>
            {t(`journey.${mode}Action`)}
          </Button>
        </form>
      ) : null}
      <nav className="mt-6 flex flex-wrap gap-4 text-sm" aria-label={t("journey.authNavigation")}>
        {mode === "login" ? (
          <Link
            to={audience === "company" ? "/company/forgot-password" : "/platform/forgot-password"}
            className="text-[var(--color-primary)] hover:underline"
          >
            {t("journey.recoveryTitle")}
          </Link>
        ) : (
          <Link
            to={audience === "company" ? "/company/login" : "/platform/login"}
            className="text-[var(--color-primary)] hover:underline"
          >
            {t("journey.loginTitle")}
          </Link>
        )}
        <Link to="/plans" className="text-[var(--color-primary)] hover:underline">
          {t("journey.publicPlans")}
        </Link>
      </nav>
    </section>
  );
}
