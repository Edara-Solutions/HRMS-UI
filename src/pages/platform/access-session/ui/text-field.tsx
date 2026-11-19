import type { UseFormRegisterReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

interface TextFieldProps {
  id: string;
  label: string;
  error: string | undefined;
  ltr: boolean;
  disabled: boolean;
  registration: UseFormRegisterReturn;
}

export function TextField({ id, label, error, ltr, disabled, registration }: TextFieldProps) {
  const { t } = useTranslation("platform-access-session");
  const errorId = `${id}-error`;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        dir={ltr ? "ltr" : undefined}
        disabled={disabled}
        aria-invalid={error !== undefined}
        aria-describedby={error ? errorId : undefined}
        {...registration}
      />
      {error && (
        <p id={errorId} className="text-xs text-[var(--color-danger)]">
          {t(`fieldError.${error}`)}
        </p>
      )}
    </div>
  );
}
