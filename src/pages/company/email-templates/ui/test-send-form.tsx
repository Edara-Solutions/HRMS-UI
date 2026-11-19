import { useMutation } from "@tanstack/react-query";
import { type FormEvent, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useCompanyAccess, useCompanyMutationRecovery } from "@/shared/api";
import { Button } from "@/shared/ui/button";
import { EnumSelect } from "@/shared/ui/enum-select";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { sendTestEmail } from "../api/email-templates";
import { type EmailType, type PreviewLocale, previewLocale } from "../model/email-templates";

const recipientSchema = z.string().trim().email();

export function TestSendForm({ type }: { type: EmailType }) {
  const { t } = useTranslation("communications");
  const recipientId = useId();
  const localeId = useId();
  const access = useCompanyAccess();
  const recover = useCompanyMutationRecovery();
  const availability = access.availability("POST /api/v1/company/emails/test-send");
  const [recipient, setRecipient] = useState(access.user?.email ?? "");
  const [locale, setLocale] = useState<PreviewLocale>(() => previewLocale(type, "en"));
  const [invalid, setInvalid] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "status" | "alert"; message: string } | null>(
    null,
  );
  const send = useMutation({ retry: false, mutationFn: sendTestEmail });

  if (availability.state === "hidden") return null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);
    const parsed = recipientSchema.safeParse(recipient);
    setInvalid(!parsed.success);
    if (!parsed.success) return;
    try {
      const queued = await send.mutateAsync({
        emailTypeKey: type.key,
        recipientEmail: parsed.data,
        locale,
      });
      setFeedback({
        tone: "status",
        message: t("templates.testQueued", { status: t(`delivery.${queued.status}`) }),
      });
    } catch (error) {
      const outcome = await recover(error);
      setFeedback({ tone: "alert", message: t(`outcome.${outcome.kind}`) });
    }
  }

  return (
    <form noValidate onSubmit={submit} aria-labelledby="test-send" className="space-y-3">
      <h3 id="test-send" className="text-sm font-semibold">
        {t("templates.testSend")}
      </h3>
      <p className="text-xs text-[var(--color-text-muted)]">{t("templates.testSendHint")}</p>
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-0 flex-1 space-y-1.5">
          <Label htmlFor={recipientId}>{t("templates.recipient")}</Label>
          <Input
            id={recipientId}
            type="email"
            dir="ltr"
            value={recipient}
            disabled={availability.state === "disabled" || send.isPending}
            aria-invalid={invalid}
            aria-describedby={invalid ? `${recipientId}-error` : undefined}
            onChange={(event) => setRecipient(event.target.value)}
          />
        </div>
        <div className="w-32 space-y-1.5">
          <Label htmlFor={localeId}>{t("templates.previewLocale")}</Label>
          <EnumSelect
            id={localeId}
            value={locale}
            disabled={availability.state === "disabled" || send.isPending}
            options={type.supportedLocales.map((option) => ({
              value: option,
              label: t(`locale.${option}`),
            }))}
            onValueChange={setLocale}
          />
        </div>
        <Button
          type="submit"
          intent="action"
          size="sm"
          disabled={availability.state === "disabled" || send.isPending}
          isLoading={send.isPending}
        >
          {t("templates.sendTest")}
        </Button>
      </div>
      {invalid && (
        <p id={`${recipientId}-error`} className="text-xs text-[var(--color-danger)]">
          {t("error.email")}
        </p>
      )}
      {availability.state === "disabled" && (
        <p className="text-xs text-[var(--color-text-muted)]">
          {t(`restriction.${availability.reason}`)}
        </p>
      )}
      <p role={feedback?.tone === "alert" ? "alert" : "status"} className="min-h-5 text-sm">
        {feedback?.message}
      </p>
    </form>
  );
}
