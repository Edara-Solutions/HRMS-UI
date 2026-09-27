import { useId, useState } from "react";
import type { z } from "zod";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";

export interface SchemaField {
  name: string;
  label: string;
  type?: "text" | "email" | "number" | "datetime-local" | "checkbox" | "textarea";
  options?: readonly { value: string; label: string }[];
  value?: string | boolean;
  required?: boolean;
  nullable?: boolean;
}
interface Props {
  schema: z.ZodTypeAny;
  fields: readonly SchemaField[];
  label: string;
  invalidLabel: string;
  disabled?: boolean;
  changedOnly?: boolean;
  serverInvalidFields?: readonly string[];
  onSubmit: (body: unknown) => void;
}
/** A schema-validated form with an explicit field whitelist; transport stays with its owner. */
export function SchemaForm({
  schema,
  fields,
  label,
  invalidLabel,
  disabled,
  changedOnly,
  serverInvalidFields,
  onSubmit,
}: Props) {
  const id = useId();
  const [invalid, setInvalid] = useState(false);
  const [rejected, setRejected] = useState<ReadonlySet<string>>(new Set());
  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (disabled) return;
        const form = new FormData(event.currentTarget);
        const body: Record<string, unknown> = {};
        for (const field of fields) {
          const raw =
            field.type === "checkbox" ? form.has(field.name) : String(form.get(field.name) ?? "");
          if (changedOnly && raw === (field.value ?? (field.type === "checkbox" ? false : "")))
            continue;
          if (raw === "" && !field.required && !field.nullable) continue;
          let value: unknown = raw;
          if (field.type === "number" && raw !== "") value = Number(raw);
          if (field.type === "datetime-local" && typeof raw === "string" && raw) {
            const instant = new Date(raw);
            value = Number.isFinite(instant.getTime()) ? instant.toISOString() : raw;
          }
          if (field.nullable && raw === "") value = null;
          const [parent, child] = field.name.split(".");
          if (child) {
            const group = body[parent];
            body[parent] = { ...(typeof group === "object" && group ? group : {}), [child]: value };
          } else body[field.name] = value;
        }
        const parsed = schema.safeParse(body);
        setInvalid(!parsed.success);
        setRejected(
          parsed.success
            ? new Set()
            : new Set(parsed.error.issues.map((issue) => issue.path.join("."))),
        );
        if (parsed.success) onSubmit(parsed.data);
      }}
    >
      {fields.map((field) => (
        <div key={field.name} className="min-w-0 space-y-1.5">
          <Label htmlFor={`${id}-${field.name}`}>{field.label}</Label>
          {field.options ? (
            <select
              id={`${id}-${field.name}`}
              name={field.name}
              aria-label={field.label}
              required={field.required}
              defaultValue={String(field.value ?? "")}
              disabled={disabled}
              aria-invalid={rejected.has(field.name) || serverInvalidFields?.includes(field.name)}
              className="min-w-0 max-w-full w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-2"
            >
              {!field.required && <option value="">—</option>}
              {field.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : field.type === "textarea" ? (
            <textarea
              id={`${id}-${field.name}`}
              name={field.name}
              aria-label={field.label}
              required={field.required}
              defaultValue={String(field.value ?? "")}
              disabled={disabled}
              aria-invalid={rejected.has(field.name) || serverInvalidFields?.includes(field.name)}
              className="min-w-0 max-w-full w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-2"
            />
          ) : field.type === "checkbox" ? (
            <input
              id={`${id}-${field.name}`}
              name={field.name}
              aria-label={field.label}
              required={field.required}
              type="checkbox"
              defaultChecked={field.value === true}
              disabled={disabled}
            />
          ) : (
            <Input
              id={`${id}-${field.name}`}
              name={field.name}
              aria-label={field.label}
              required={field.required}
              type={field.type ?? "text"}
              defaultValue={String(field.value ?? "")}
              disabled={disabled}
              aria-invalid={rejected.has(field.name) || serverInvalidFields?.includes(field.name)}
            />
          )}
        </div>
      ))}
      {invalid && (
        <p role="alert" className="sm:col-span-2">
          {invalidLabel}
        </p>
      )}
      <Button type="submit" intent="action" disabled={disabled}>
        {label}
      </Button>
    </form>
  );
}
