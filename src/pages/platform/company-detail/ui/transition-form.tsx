import { useState } from "react";
import { useTranslation } from "react-i18next";
import { platformCompanyOperations as operations } from "@/shared/api";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import type { PendingCommand } from "../model/use-company-commands";

interface Props {
  kind: "updatePolicy" | "extendTrial";
  disabled: boolean;
  request: (item: PendingCommand) => void;
  minimumDate?: string;
}
function toInstant(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : value;
}
export function TransitionForm({ kind, disabled, request, minimumDate }: Props) {
  const { t } = useTranslation("platform-companies");
  const [values, setValues] = useState({
    mode: "NORMAL",
    reason: "",
    from: "",
    until: "",
    note: "",
  });
  const { mode, reason, from, until, note } = values;
  const [invalid, setInvalid] = useState(false);
  const policy = kind === "updatePolicy";
  return (
    <form
      className="grid gap-3 border-t border-[var(--color-border)] pt-4"
      onSubmit={(event) => {
        event.preventDefault();
        const body = policy
          ? {
              mode,
              reason,
              effectiveFrom: toInstant(from),
              effectiveUntil: until ? toInstant(until) : null,
              note: note || null,
            }
          : { trialEndDate: toInstant(from), reason };
        const parsed = operations[kind].requestSchema.shape.body.safeParse(body);
        const ordered = policy
          ? !until || toInstant(until) > toInstant(from)
          : !minimumDate || toInstant(from) > minimumDate;
        setInvalid(!parsed.success || !ordered);
        if (parsed.success && ordered) request({ command: kind, body: parsed.data });
      }}
    >
      {policy && (
        <div className="space-y-1.5">
          <Label htmlFor="policy-mode">{t("policy.configuredMode")}</Label>
          <select
            id="policy-mode"
            value={mode}
            disabled={disabled}
            onChange={(event) => setValues({ ...values, mode: event.target.value })}
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-2"
          >
            {["NORMAL", "READ_ONLY", "FROZEN", "BLOCKED", "MAINTENANCE"].map((value) => (
              <option key={value} value={value}>
                {t(`mode.${value}`)}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="space-y-1.5">
        <Label htmlFor={`${kind}-date`}>
          {t(policy ? "policy.effectiveFrom" : "subscription.trialEndDate")}
        </Label>
        <Input
          id={`${kind}-date`}
          type="datetime-local"
          value={from}
          required
          disabled={disabled}
          onChange={(event) => setValues({ ...values, from: event.target.value })}
        />
      </div>
      {policy && (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="policy-until">{t("policy.effectiveUntil")}</Label>
            <Input
              id="policy-until"
              type="datetime-local"
              value={until}
              disabled={disabled}
              onChange={(event) => setValues({ ...values, until: event.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="policy-note">{t("note")}</Label>
            <Input
              id="policy-note"
              value={note}
              maxLength={1000}
              disabled={disabled}
              onChange={(event) => setValues({ ...values, note: event.target.value })}
            />
          </div>
        </>
      )}
      <div className="space-y-1.5">
        <Label htmlFor={`${kind}-reason`}>{t("reason")}</Label>
        <Input
          id={`${kind}-reason`}
          value={reason}
          maxLength={255}
          required
          disabled={disabled}
          onChange={(event) => setValues({ ...values, reason: event.target.value })}
        />
      </div>
      {invalid && <p role="alert">{t("invalid")}</p>}
      <Button type="submit" intent="action" disabled={disabled}>
        {t(`action.${kind}`)}
      </Button>
    </form>
  );
}
