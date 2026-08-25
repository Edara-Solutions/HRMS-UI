import { Rows2, Rows3 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { auditNamespace } from "@/features/audit-filters";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";
import { Tooltip } from "@/shared/ui/tooltip";
import type { AuditDensity } from "./audit-event-row";

interface AuditDensityControlProps {
  density: AuditDensity;
  onChange: (density: AuditDensity) => void;
}

/** Two rows against three: the icon shows how much of the page one event will take. */
const densityIcons = { comfortable: Rows2, compact: Rows3 } as const;

const densities = ["comfortable", "compact"] as const;

/**
 * How tightly the trail packs its rows, as a segmented pair of icons. The glyphs carry the
 * meaning — a taller row against a tighter one — and each names itself on hover and focus,
 * so the control costs a corner of the header rather than a line of it.
 */
export function AuditDensityControl({ density, onChange }: AuditDensityControlProps) {
  const { t } = useTranslation(auditNamespace);

  return (
    <div className="flex items-center justify-end border-b border-[var(--color-border)] px-3 py-2">
      <div
        role="group"
        aria-label={t("chrome.density")}
        className="inline-flex items-center gap-0.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-0.5"
      >
        {densities.map((option) => {
          const Icon = densityIcons[option];
          const label = t(`chrome.${option}`);
          const selected = density === option;

          return (
            <Tooltip key={option} content={label}>
              <Button
                variant="ghost"
                size="iconXs"
                iconOnly
                aria-label={label}
                aria-pressed={selected}
                className={cn(
                  "size-6 border-transparent text-[var(--color-text-faint)] hover:bg-transparent hover:text-[var(--color-text)]",
                  selected &&
                    "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface)]",
                )}
                onClick={() => onChange(option)}
              >
                <Icon size={13} aria-hidden="true" />
              </Button>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}
