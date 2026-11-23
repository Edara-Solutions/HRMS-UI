import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { platformLeadOperations as operations } from "@/shared/api";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { QueryPanel } from "@/shared/ui/query-panel";
import { Textarea } from "@/shared/ui/textarea";
import { isAutomatedActivity } from "../model/activity-summary";

const schema = operations.addActivity.requestSchema.shape.body;
const noteLimit = schema.shape.note.maxLength ?? 1000;
const manualTypes = schema.shape.type.options
  .map(({ value }) => value)
  .filter((type) => !isAutomatedActivity(type));

interface Props {
  disabled: boolean;
  onSubmit: (body: unknown) => void;
}

export function ActivityForm({ disabled, onSubmit }: Props) {
  const { t, i18n } = useTranslation("platform-leads");
  const id = useId();
  const [note, setNote] = useState("");
  const [invalid, setInvalid] = useState(false);
  const number = new Intl.NumberFormat(i18n.language);

  return (
    <QueryPanel title={t("action.addActivity")}>
      <form
        className="space-y-4"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (disabled) return;
          const form = new FormData(event.currentTarget);
          const result = schema.safeParse({ type: form.get("type"), note: note.trim() });
          if (!result.success || !result.data.note || isAutomatedActivity(result.data.type)) {
            setInvalid(true);
            return;
          }
          onSubmit(result.data);
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-type`}>{t("activity.type")}</Label>
          <select
            id={`${id}-type`}
            name="type"
            defaultValue="NOTE"
            disabled={disabled}
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] disabled:opacity-60"
          >
            {manualTypes.map((type) => (
              <option key={type} value={type}>
                {t(`enum.${type}`)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-note`}>{t("activity.note")}</Label>
          <Textarea
            id={`${id}-note`}
            value={note}
            rows={4}
            maxLength={noteLimit}
            disabled={disabled}
            required
            dir="auto"
            placeholder={t("activity.notePlaceholder")}
            aria-invalid={invalid}
            aria-describedby={invalid ? `${id}-error` : undefined}
            onChange={(event) => {
              setNote(event.target.value);
              setInvalid(false);
            }}
          />
          <p
            className="text-end text-xs tabular-nums text-[var(--color-text-muted)]"
            aria-hidden="true"
          >
            {t("activity.noteCount", {
              current: number.format(note.length),
              total: number.format(noteLimit),
            })}
          </p>
          {invalid && (
            <p id={`${id}-error`} role="alert" className="text-sm text-[var(--color-danger)]">
              {t("activity.noteInvalid")}
            </p>
          )}
        </div>
        <div className="flex justify-end">
          <Button type="submit" intent="cta" disabled={disabled}>
            {t("action.addActivity")}
          </Button>
        </div>
      </form>
    </QueryPanel>
  );
}
