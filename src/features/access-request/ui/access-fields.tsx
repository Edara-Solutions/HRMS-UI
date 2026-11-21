import { useId } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/shared/lib/cn";
import { EnumSelect } from "@/shared/ui/enum-select";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { type AccessLength, type AccessScope, NOTE_MAX } from "../model/access-request";

export function useLengthLabel() {
  const { t } = useTranslation("platform-access-session");
  return (minutes: number) =>
    minutes < 60
      ? t("access.length.minutes", { count: minutes })
      : t("access.length.hours", { count: minutes / 60 });
}

interface ChoiceFieldProps<Value extends string> {
  label: string;
  value: Value | undefined;
  options: readonly { value: Value; label: string }[];
  placeholder: string;
  onChange: (value: Value) => void;
}

export function ChoiceField<Value extends string>({
  label,
  value,
  options,
  placeholder,
  onChange,
}: ChoiceFieldProps<Value>) {
  const id = useId();
  return (
    <div className="min-w-0 space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <EnumSelect
        id={id}
        value={value}
        options={options}
        placeholder={placeholder}
        onValueChange={onChange}
      />
    </div>
  );
}

interface ScopeLengthFieldsProps {
  scope: AccessScope | undefined;
  minutes: AccessLength | undefined;
  scopes: readonly AccessScope[];
  lengths: readonly AccessLength[];
  requested?: { scope: AccessScope; minutes: number };
  onScope: (scope: AccessScope) => void;
  onMinutes: (minutes: AccessLength) => void;
}

export function ScopeLengthFields({
  scope,
  minutes,
  scopes,
  lengths,
  requested,
  onScope,
  onMinutes,
}: ScopeLengthFieldsProps) {
  const { t } = useTranslation("platform-access-session");
  const lengthLabel = useLengthLabel();
  const requestedSuffix = ` · ${t("access.requested")}`;
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <ChoiceField
        label={t("access.field.scope")}
        value={scope}
        placeholder={t("access.field.scopePlaceholder")}
        options={scopes.map((value) => ({
          value,
          label: `${t(`access.scope.${value}`)}${requested?.scope === value ? requestedSuffix : ""}`,
        }))}
        onChange={onScope}
      />
      <ChoiceField
        label={t("access.field.length")}
        value={minutes === undefined ? undefined : String(minutes)}
        placeholder={t("access.field.lengthPlaceholder")}
        options={lengths.map((value) => ({
          value: String(value),
          label: `${lengthLabel(value)}${requested?.minutes === value ? requestedSuffix : ""}`,
        }))}
        onChange={(value) => {
          const length = lengths.find((candidate) => String(candidate) === value);
          if (length !== undefined) onMinutes(length);
        }}
      />
    </div>
  );
}

interface NoteFieldProps {
  label: string;
  placeholder: string;
  value: string;
  minLength: number;
  onChange: (value: string) => void;
}

export function NoteField({ label, placeholder, value, minLength, onChange }: NoteFieldProps) {
  const { t } = useTranslation("platform-access-session");
  const id = useId();
  const hintId = useId();
  const length = value.trim().length;
  const short = minLength > 0 && length > 0 && length < minLength;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Textarea
        id={id}
        rows={4}
        maxLength={NOTE_MAX}
        value={value}
        placeholder={placeholder}
        aria-describedby={hintId}
        aria-invalid={short || undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      <p
        id={hintId}
        className={cn(
          "flex justify-between gap-2 text-xs text-[var(--color-text-muted)]",
          short && "text-[var(--color-danger)]",
        )}
      >
        <span>
          {minLength > 0 ? t("access.note.min", { count: minLength }) : t("access.note.optional")}
        </span>
        <span className="tabular-nums">
          {length} / {NOTE_MAX}
        </span>
      </p>
    </div>
  );
}
