import { useTranslation } from "react-i18next";
import { usePreferencesStore } from "@/shared/config";
import { formatInstant } from "@/shared/lib/format-instant";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
  type AuditDatePreset,
  auditDatePresets,
  auditPresetRange,
  fromDateTimeLocalValue,
  toDateTimeLocalValue,
} from "../model/audit-date-range";
import { auditNamespace } from "../model/audit-text";
import { AuditFilterPopover } from "./audit-filter-popover";

interface AuditDateRangeFilterProps {
  id: string;
  occurredFrom?: string;
  occurredTo?: string;
  onChange: (range: { occurredFrom?: string; occurredTo?: string }) => void;
}

const presetLabelKeys: Record<AuditDatePreset, string> = {
  last24Hours: "chrome.filterPresetLast24Hours",
  last7Days: "chrome.filterPresetLast7Days",
  last30Days: "chrome.filterPresetLast30Days",
};

/**
 * The half-open `[from, to)` window, offered as presets beside an explicit range. There is
 * no default: a hidden window turns "I cannot find my event" into a support ticket.
 */
export function AuditDateRangeFilter({
  id,
  occurredFrom,
  occurredTo,
  onChange,
}: AuditDateRangeFilterProps) {
  const { t } = useTranslation(auditNamespace);
  const locale = usePreferencesStore((state) => state.locale);
  const fromId = `${id}-from`;
  const toId = `${id}-to`;

  return (
    <AuditFilterPopover
      id={id}
      label={t("chrome.filterDateRange")}
      summary={rangeSummary()}
      onClear={() => onChange({ occurredFrom: undefined, occurredTo: undefined })}
    >
      {() => (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-1.5">
            {auditDatePresets.map((preset) => (
              <Button
                key={preset}
                variant="ghost"
                size="xs"
                onClick={() => onChange(auditPresetRange(preset))}
              >
                {t(presetLabelKeys[preset])}
              </Button>
            ))}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={fromId}>{t("chrome.filterFrom")}</Label>
            <Input
              id={fromId}
              type="datetime-local"
              value={toDateTimeLocalValue(occurredFrom)}
              onChange={(event) =>
                onChange({
                  occurredFrom: fromDateTimeLocalValue(event.target.value),
                  occurredTo,
                })
              }
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={toId}>{t("chrome.filterTo")}</Label>
            <Input
              id={toId}
              type="datetime-local"
              value={toDateTimeLocalValue(occurredTo)}
              onChange={(event) =>
                onChange({
                  occurredFrom,
                  occurredTo: fromDateTimeLocalValue(event.target.value),
                })
              }
            />
            <p className="text-[11px] text-[var(--color-text-muted)]">
              {t("chrome.filterRangeIsHalfOpen")}
            </p>
          </div>
        </div>
      )}
    </AuditFilterPopover>
  );

  function rangeSummary(): string | undefined {
    if (occurredFrom && occurredTo) {
      return `${formatInstant(occurredFrom, locale)} – ${formatInstant(occurredTo, locale)}`;
    }
    if (occurredFrom)
      return t("chrome.filterSince", { instant: formatInstant(occurredFrom, locale) });
    if (occurredTo) return t("chrome.filterBefore", { instant: formatInstant(occurredTo, locale) });
    return undefined;
  }
}
