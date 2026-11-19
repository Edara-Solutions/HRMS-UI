import { type FormEvent, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { usePlatformCommand } from "@/features/platform-communications-command";
import {
  ContractViolation,
  platformCommunicationsOperations as operations,
  usePlatformAccess,
} from "@/shared/api";
import { Button } from "@/shared/ui/button";
import { EnumSelect } from "@/shared/ui/enum-select";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { sendTestEmail } from "../api/emails";
import { type PlatformEmailType, type PlatformPreviewLocale, previewLocale } from "../model/emails";
import { CommandFeedback } from "./command-feedback";

interface Props {
  type: PlatformEmailType;
}
export function TestSendForm({ type }: Props) {
  const { t } = useTranslation("platform-emails");
  const recipientId = useId();
  const localeId = useId();
  const access = usePlatformAccess();
  const command = usePlatformCommand();
  const availability = access.availability(operations.testSend.key);
  const [recipient, setRecipient] = useState(access.user?.email ?? "");
  const [locale, setLocale] = useState<PlatformPreviewLocale>(() => previewLocale(type, "en"));
  const [invalid, setInvalid] = useState(false);
  if (availability.state === "hidden" || type.context !== "EDARA") return null;
  const busy = availability.state !== "enabled" || command.pending || command.blocked;
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = operations.testSend.requestSchema.shape.body.safeParse({
      emailTypeKey: type.key,
      recipientEmail: recipient.trim(),
      locale,
    });
    setInvalid(!parsed.success);
    if (!parsed.success || busy) return;
    void command.run(operations.testSend.key, async (check) => {
      check();
      const result = await sendTestEmail(parsed.data);
      if (
        result.context !== "EDARA" ||
        result.emailTypeKey !== type.key ||
        result.locale !== locale ||
        !result.isTest
      )
        throw new ContractViolation({
          audience: "platform",
          key: operations.testSend.key,
          status: 202,
          phase: "response",
        });
      return result;
    });
  }
  return (
    <form noValidate onSubmit={submit} className="space-y-3">
      <h3 className="font-semibold">{t("testSend.title")}</h3>
      <p>{t("testSend.hint")}</p>
      <Label htmlFor={recipientId}>{t("testSend.recipient")}</Label>
      <Input
        id={recipientId}
        type="email"
        dir="ltr"
        value={recipient}
        disabled={busy}
        aria-invalid={invalid}
        onChange={(event) => setRecipient(event.target.value)}
      />
      <Label htmlFor={localeId}>{t("testSend.locale")}</Label>
      <EnumSelect
        id={localeId}
        value={locale}
        disabled={busy}
        options={type.supportedLocales.map((value) => ({ value, label: t(`locale.${value}`) }))}
        onValueChange={setLocale}
      />
      <Button type="submit" disabled={busy}>
        {t("testSend.send")}
      </Button>
      {invalid && <p role="alert">{t("error.email")}</p>}
      <CommandFeedback command={command} />
    </form>
  );
}
