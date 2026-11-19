import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChangePasswordForm } from "@/features/auth";
import { readCredentialContext, retainCredentialContext, useAudienceSession } from "@/shared/auth";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogDescription, DialogTitle, useDialogIds } from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { PasswordInput } from "@/shared/ui/password-input";
import type { SelfIdentity, SelfService } from "../api/self-service";

interface SecurityPanelProps {
  identity: SelfIdentity;
  service: SelfService;
}

export function SecurityPanel({ identity, service }: SecurityPanelProps) {
  const { t } = useTranslation("auth");
  const navigate = useNavigate();
  const { generation } = useAudienceSession(identity.audience);
  const retained = readCredentialContext(identity.audience, generation);
  const [feedback, setFeedback] = useState<string | null>(() =>
    retained?.newEmail ? t("account.uncertainChange") : null,
  );
  const [newEmail, setNewEmail] = useState(() => retained?.newEmail ?? "");
  const [confirmation, setConfirmation] = useState<"email" | "logout-all" | null>(null);
  const [emailInput, setEmailInput] = useState<unknown>(null);
  const { titleId, descriptionId } = useDialogIds();
  const changeEmail = useMutation({
    mutationFn: service.changeEmail,
    retry: false,
    onSuccess: () => {
      retainCredentialContext(identity.audience, generation, { newEmail: undefined });
      setEmailInput(null);
      setConfirmation(null);
      setFeedback(t("account.emailChanged"));
    },
    onError: () => {
      setConfirmation(null);
      setFeedback(t("account.uncertainChange"));
    },
  });
  const logout = useMutation({
    mutationFn: (all: boolean) => service.signOut(all),
    retry: false,
    onSuccess: (result) =>
      void navigate({
        to: identity.audience === "company" ? "/company/login" : "/platform/login",
        search: { localSignOutOnly: !result.remoteConfirmed },
      }),
  });
  const pending = changeEmail.isPending || logout.isPending;

  function requestEmailChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const input = Object.fromEntries(new FormData(event.currentTarget));
    const parsed = service.schemas.email.safeParse(input);
    if (!parsed.success) {
      setFeedback(t("journey.checkFields"));
      return;
    }
    setEmailInput(parsed.data);
    retainCredentialContext(identity.audience, generation, { newEmail: parsed.data.newEmail });
    setConfirmation("email");
  }

  return (
    <div className="max-w-lg space-y-8">
      {feedback ? (
        <p role="status" className="text-sm">
          {feedback}
        </p>
      ) : null}
      <section aria-labelledby="email-heading">
        <h2 id="email-heading" className="text-base font-semibold">
          {t("account.changeEmail")}
        </h2>
        <form
          onSubmit={requestEmailChange}
          className="mt-4 space-y-4"
          aria-busy={changeEmail.isPending}
        >
          <div className="space-y-1.5">
            <Label htmlFor="security-new-email">{t("account.newEmail")}</Label>
            <Input
              id="security-new-email"
              name="newEmail"
              type="email"
              required
              maxLength={255}
              autoComplete="email"
              value={newEmail}
              onChange={(event) => setNewEmail(event.target.value)}
              disabled={pending}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="security-email-password">{t("account.currentPassword")}</Label>
            <PasswordInput
              id="security-email-password"
              name="currentPassword"
              required
              maxLength={128}
              autoComplete="current-password"
              disabled={pending}
            />
          </div>
          <Button type="submit" intent="action" disabled={pending}>
            {t("account.reviewEmailChange")}
          </Button>
        </form>
      </section>
      <section aria-labelledby="password-heading">
        <h2 id="password-heading" className="text-base font-semibold">
          {t("account.changePassword")}
        </h2>
        <div className="mt-4">
          <ChangePasswordForm audience={identity.audience} />
        </div>
      </section>
      <section
        aria-labelledby="sign-out-heading"
        className="border-t border-[var(--color-border)] pt-6"
      >
        <h2 id="sign-out-heading" className="text-base font-semibold">
          {t("account.signOutTitle")}
        </h2>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          {t("account.signOutDescription", { audience: t(`journey.${identity.audience}`) })}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button intent="action" disabled={pending} onClick={() => logout.mutate(false)}>
            {t("account.signOutHere")}
          </Button>
          <Button
            intent="destructive-trigger"
            disabled={pending}
            onClick={() => setConfirmation("logout-all")}
          >
            {t("account.signOutAll")}
          </Button>
        </div>
      </section>
      <Dialog
        open={confirmation !== null}
        onClose={() => {
          if (!pending) {
            setConfirmation(null);
            setEmailInput(null);
          }
        }}
        dismissible={!pending}
        titleId={titleId}
        descriptionId={descriptionId}
      >
        <DialogTitle id={titleId}>
          {t(confirmation === "email" ? "account.changeEmail" : "account.signOutAll")}
        </DialogTitle>
        <DialogDescription id={descriptionId}>
          {t(
            confirmation === "email"
              ? "account.emailConfirmation"
              : "account.signOutAllConfirmation",
            { audience: t(`journey.${identity.audience}`) },
          )}
        </DialogDescription>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button
            intent={confirmation === "email" ? "cta" : "destructive"}
            disabled={pending}
            isLoading={pending}
            onClick={() => {
              if (confirmation === "email") changeEmail.mutate(emailInput);
              else logout.mutate(true);
            }}
          >
            {t("account.confirm")}
          </Button>
          <Button
            intent="dismissive"
            disabled={pending}
            onClick={() => {
              setConfirmation(null);
              setEmailInput(null);
            }}
          >
            {t("account.cancel")}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
