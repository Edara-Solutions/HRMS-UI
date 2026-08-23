import { useTranslation } from "react-i18next";
import { usePreferencesStore } from "@/shared/config";
import { formatInstant } from "@/shared/lib/format-instant";
import { Button } from "@/shared/ui/button";
import { DateTimePicker, type DateTimePickerText } from "@/shared/ui/date-time-picker";
import {
  type AuditDatePreset,
  auditDatePresets,
  auditPresetRange,
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
  const pickerText: Partial<DateTimePickerText> = {
    description: t("chrome.filterPickerDescription"),
    placeholder: t("chrome.filterPickerPlaceholder"),
    hour: t("chrome.filterPickerHour"),
    minute: t("chrome.filterPickerMinute"),
    minuteHint: t("chrome.filterPickerMinuteHint"),
    period: t("chrome.filterPickerPeriod"),
    previousMonth: t("chrome.filterPickerPreviousMonth"),
    nextMonth: t("chrome.filterPickerNextMonth"),
    clear: t("chrome.filterClearSelection"),
    cancel: t("chrome.filterPickerCancel"),
    apply: t("chrome.filterPickerApply"),
  };

  function rangeSummary(): string | undefined {
    if (occurredFrom && occurredTo) {
      return `${formatInstant(occurredFrom, locale)} – ${formatInstant(occurredTo, locale)}`;
    }
    if (occurredFrom) {
      return t("chrome.filterSince", { instant: formatInstant(occurredFrom, locale) });
    }
    if (occurredTo) {
      return t("chrome.filterBefore", { instant: formatInstant(occurredTo, locale) });
    }
    return undefined;
  }

  return (
    <AuditFilterPopover
      id={id}
      label={t("chrome.filterDateRange")}
      summary={rangeSummary()}
      onClear={() => onChange({ occurredFrom: undefined, occurredTo: undefined })}
    >
      {() => (
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-faint)]">
              {t("chrome.filterQuickRanges")}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {auditDatePresets.map((preset) => (
                <Button
                  key={preset}
                  variant="secondary"
                  size="xs"
                  onClick={() => onChange(auditPresetRange(preset))}
                >
                  {t(presetLabelKeys[preset])}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-[var(--color-border)] pt-3">
            <DateTimePicker
              id={`${id}-from`}
              label={t("chrome.filterFrom")}
              value={occurredFrom}
              boundary="from"
              locale={locale}
              text={pickerText}
              onChange={(nextFrom) => onChange({ occurredFrom: nextFrom, occurredTo })}
            />
            <DateTimePicker
              id={`${id}-to`}
              label={t("chrome.filterTo")}
              value={occurredTo}
              boundary="to"
              locale={locale}
              text={pickerText}
              onChange={(nextTo) => onChange({ occurredFrom, occurredTo: nextTo })}
            />
            <p className="text-[11px] text-[var(--color-text-muted)]">
              {t("chrome.filterRangeIsHalfOpen")}
            </p>
          </div>
        </div>
      )}
    </AuditFilterPopover>
  );
}
