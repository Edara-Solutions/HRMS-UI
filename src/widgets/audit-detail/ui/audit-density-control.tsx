import type { SupportedLocale } from "@/shared/i18n";
import { Button } from "@/shared/ui/button";
import { getAuditCopy } from "../model/audit-copy";
import type { AuditDensity } from "./audit-event-row";

interface AuditDensityControlProps {
  density: AuditDensity;
  locale: SupportedLocale;
  onChange: (density: AuditDensity) => void;
}

export function AuditDensityControl({ density, locale, onChange }: AuditDensityControlProps) {
  const copy = getAuditCopy(locale);
  return (
    <div className="flex items-center justify-end gap-1 border-b border-[var(--color-border)] px-3 py-2">
      <span className="me-1 text-[11px] text-[var(--color-text-faint)]">{copy.density}</span>
      {(["comfortable", "compact"] as const).map((option) => (
        <Button
          key={option}
          variant="ghost"
          size="xs"
          pressed={density === option}
          onClick={() => onChange(option)}
        >
          {copy[option]}
        </Button>
      ))}
    </div>
  );
}
