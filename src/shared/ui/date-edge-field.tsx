import { useId } from "react";
import { useTranslation } from "react-i18next";
import type { DateEdgeValue } from "../lib/date-edge";
import { Input } from "./input";
import { Label } from "./label";
export function DateEdgeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: DateEdgeValue;
  onChange: (value: DateEdgeValue | undefined) => void;
}) {
  const id = useId();
  const { t } = useTranslation("common");
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="date"
        value={value?.date ?? ""}
        onChange={(event) =>
          onChange(
            event.target.value
              ? { date: event.target.value, edgeDateType: value?.edgeDateType ?? "inclusive" }
              : undefined,
          )
        }
      />
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          disabled={!value}
          checked={value?.edgeDateType !== "exclusive"}
          onChange={(event) => {
            if (value)
              onChange({
                ...value,
                edgeDateType: event.target.checked ? "inclusive" : "exclusive",
              });
          }}
        />
        {t("date.includeBoundary")}
      </label>
    </div>
  );
}
