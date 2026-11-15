import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import {
  loadCompanyPasswordContract,
  loadPlatformPasswordContract,
  OperationRefusal,
} from "@/shared/api";
import {
  type AudienceName,
  readCredentialContext,
  retainCredentialContext,
  useAudienceSession,
} from "@/shared/auth";
import { fieldErrorMap, passwordRuleHint } from "@/shared/i18n";
import { Button } from "@/shared/ui/button";
import { Form } from "@/shared/ui/form";
import { Label } from "@/shared/ui/label";
import { PasswordInput } from "@/shared/ui/password-input";
import { useChangePassword } from "../api/change-password";

interface ChangePasswordFormProps {
  audience: AudienceName;
}

export function ChangePasswordForm({ audience }: ChangePasswordFormProps) {
  const { t } = useTranslation("auth");
  const changePassword = useChangePassword(audience);
  const navigate = useNavigate();
  const { generation } = useAudienceSession(audience);
  const [feedback, setFeedback] = useState<string | null>(() =>
    readCredentialContext(audience, generation)?.passwordAttempted
      ? t("account.uncertainChange")
      : null,
  );
  const {
    data: contract,
    isError: contractUnavailable,
    refetch: reloadContract,
  } = useQuery({
    queryKey: [audience, "password-contract"],
    queryFn: () =>
      audience === "company" ? loadCompanyPasswordContract() : loadPlatformPasswordContract(),
    staleTime: Infinity,
    retry: false,
  });
  const schema = contract?.requestSchema.shape.body
    .extend({ confirmPassword: z.string().min(1) })
    .refine((input) => input.newPassword === input.confirmPassword, {
      path: ["confirmPassword"],
      message: t("journey.passwordMismatch"),
    });
  type PasswordFormData = z.infer<NonNullable<typeof schema>>;
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PasswordFormData>({
    resolver: schema ? zodResolver(schema, { errorMap: fieldErrorMap(t) }) : undefined,
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  async function submit(input: PasswordFormData) {
    if (!schema || changePassword.isPending) return;
    setFeedback(null);
    retainCredentialContext(audience, generation, { passwordAttempted: true });
    try {
      const session = await changePassword.mutateAsync({
        currentPassword: input.currentPassword,
        newPassword: input.newPassword,
      });
      retainCredentialContext(audience, generation, { passwordAttempted: false });
      await navigate({
        href: session.user.mustChangePassword
          ? `/${audience}/change-password`
          : `/${audience}/dashboard`,
      });
    } catch (error) {
      setFeedback(
        t(
          error instanceof OperationRefusal && error.status === 429
            ? "journey.rateLimited"
            : "account.uncertainChange",
        ),
      );
    }
  }

  return (
    <Form noValidate onSubmit={handleSubmit(submit)} aria-busy={changePassword.isPending}>
      {feedback ? (
        <p role="status" className="text-sm text-[var(--color-text-muted)]">
          {feedback}
        </p>
      ) : null}
      {contractUnavailable ? <p role="status">{t("journey.unavailable")}</p> : null}
      {(["currentPassword", "newPassword", "confirmPassword"] as const).map((name) => {
        const hint = passwordRuleHint(t, contract?.requestSchema.shape.body, name);
        const describedBy = [
          hint ? `password-change-${name}-hint` : null,
          errors[name] ? `password-change-${name}-error` : null,
        ].filter(Boolean);
        return (
          <div key={name} className="space-y-1.5">
            <Label htmlFor={`password-change-${name}`}>
              {t(name === "currentPassword" ? "account.currentPassword" : `journey.${name}`)}
            </Label>
            <PasswordInput
              id={`password-change-${name}`}
              autoComplete={name === "currentPassword" ? "current-password" : "new-password"}
              required
              maxLength={128}
              aria-invalid={!!errors[name]}
              aria-describedby={describedBy.length > 0 ? describedBy.join(" ") : undefined}
              disabled={changePassword.isPending || !schema}
              {...register(name)}
            />
            {hint ? (
              <p
                id={`password-change-${name}-hint`}
                className="text-xs text-[var(--color-text-muted)]"
              >
                {hint}
              </p>
            ) : null}
            {errors[name] ? (
              <p
                id={`password-change-${name}-error`}
                className="text-xs text-[var(--color-danger)]"
              >
                {errors[name].message}
              </p>
            ) : null}
          </div>
        );
      })}
      <Button
        type="submit"
        intent="cta"
        size="block"
        disabled={changePassword.isPending || !schema}
        isLoading={changePassword.isPending}
      >
        {t("account.changePassword")}
      </Button>
      {contractUnavailable ? (
        <Button intent="action" onClick={() => void reloadContract()}>
          {t("journey.retry")}
        </Button>
      ) : null}
    </Form>
  );
}
