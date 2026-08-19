import { useTranslation } from "react-i18next";
import { auditNamespace } from "@/features/audit-filters";
import { Button } from "@/shared/ui/button";
import type { AuditDensity } from "./audit-event-row";

interface AuditDensityControlProps {
  density: AuditDensity;
  onChange: (density: AuditDensity) => void;
}

export function AuditDensityControl({ density, onChange }: AuditDensityControlProps) {
  const { t } = useTranslation(auditNamespace);
  return (
    <div className="flex items-center justify-end gap-1 border-b border-[var(--color-border)] px-3 py-2">
      <span className="me-1 text-[11px] text-[var(--color-text-faint)]">{t("chrome.density")}</span>
      {(["comfortable", "compact"] as const).map((option) => (
        <Button
          key={option}
          variant="ghost"
          size="xs"
          pressed={density === option}
          onClick={() => onChange(option)}
        >
          {t(`chrome.${option}`)}
        </Button>
      ))}
    </div>
  );
}
