import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import type { SupportedLocale } from "@/shared/i18n";
import { cn } from "@/shared/lib/cn";
import {
  allowEdgeDateChoice,
  type DateEdgeType,
  type DateEdgeValue,
  dateEdgeTypeValues,
  toDateEdgeValue,
} from "@/shared/lib/date-edge";
import { Button } from "./button";
import { Dialog, DialogDescription, DialogTitle, useDialogIds } from "./dialog";
import { Label } from "./label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";

const localeTags: Record<SupportedLocale, string> = {
  en: "en-GB",
  ar: "ar-SA-u-ca-gregory",
};

// Building an `Intl.DateTimeFormat` is expensive, and a picker rebuilds these on every
// keystroke in its minute field. They depend on nothing but the locale, so they are built
// once per locale and kept.
const formatters = new Map<string, Intl.DateTimeFormat>();

export function dateFormatterFor(
  locale: SupportedLocale,
  name: string,
  options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  const key = `${locale}:${name}`;
  const cached = formatters.get(key);
  if (cached) return cached;

  const created = new Intl.DateTimeFormat(localeTags[locale], options);
  formatters.set(key, created);
  return created;
}

const weekdayNamesByLocale = new Map<SupportedLocale, string[]>();

function weekdayNames(locale: SupportedLocale): string[] {
  const cached = weekdayNamesByLocale.get(locale);
  if (cached) return cached;

  const formatter = dateFormatterFor(locale, "weekday", { weekday: "short" });
  // 1 January 2024 was a Monday, and the grid starts its week there.
  const names = Array.from({ length: 7 }, (_, index) =>
    formatter.format(new Date(2024, 0, 1 + index)),
  );
  weekdayNamesByLocale.set(locale, names);
  return names;
}

const DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function toDateKey(value: Date): string {
  return [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, "0"),
    String(value.getDate()).padStart(2, "0"),
  ].join("-");
}

export function parseDateValue(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnlyMatch) {
    const year = Number(dateOnlyMatch[1]);
    const month = Number(dateOnlyMatch[2]) - 1;
    const day = Number(dateOnlyMatch[3]);
    return new Date(year, month, day);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date;
}

function formatDateValue(value: string | undefined): string {
  const date = parseDateValue(value);
  if (!date) return "Choose date";
  return DATE_FORMATTER.format(date);
}

const DATE_EDGE_LABEL: Record<DateEdgeType, string> = {
  inclusive: "Inclusive",
  exclusive: "Exclusive",
};

export interface CalendarGridProps {
  month: Date;
  selected: Date | undefined;
  onMonthChange: (month: Date) => void;
  onSelectDay: (day: number) => void;
  /** Which calendar the month, weekday and day names are spelled in. */
  locale?: SupportedLocale;
  previousMonthLabel?: string;
  nextMonthLabel?: string;
}

export function CalendarGrid({
  month,
  selected,
  onMonthChange,
  onSelectDay,
  locale = "en",
  previousMonthLabel = "Previous month",
  nextMonthLabel = "Next month",
}: CalendarGridProps) {
  const firstWeekday = (month.getDay() + 6) % 7;
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const selectedKey = selected ? toDateKey(selected) : undefined;
  const todayKey = toDateKey(new Date());
  const monthLabel = dateFormatterFor(locale, "month", {
    month: "long",
    year: "numeric",
  }).format(month);
  const dayLabels = dateFormatterFor(locale, "day", { dateStyle: "full" });

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="ghost"
          size="iconXs"
          aria-label={previousMonthLabel}
          onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
        >
          <ChevronLeft size={15} />
        </Button>
        <p className="text-[13px] font-semibold tracking-tight text-[var(--color-text)]">
          {monthLabel}
        </p>
        <Button
          variant="ghost"
          size="iconXs"
          aria-label={nextMonthLabel}
          onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
        >
          <ChevronRight size={15} />
        </Button>
      </div>
      <div className="mt-4 grid grid-cols-7 gap-1.5 text-center text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-faint)]">
        {weekdayNames(locale).map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1.5" role="grid" aria-label={monthLabel}>
        {Array.from({ length: firstWeekday + daysInMonth }, (_, index) => {
          if (index < firstWeekday) return <span key={`blank-${index}`} />;
          const day = index - firstWeekday + 1;
          const date = new Date(month.getFullYear(), month.getMonth(), day);
          const dateKey = toDateKey(date);
          const selectedDay = dateKey === selectedKey;
          return (
            <button
              key={dateKey}
              type="button"
              className={cn(
                "mx-auto flex size-9 items-center justify-center rounded-[var(--radius-md)] text-[13px] tabular-nums transition-colors duration-[var(--motion-fast)] ease-[var(--motion-easing)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]",
                selectedDay
                  ? "bg-[var(--color-primary-fill)] font-semibold text-[var(--color-on-primary)]"
                  : "font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]",
                dateKey === todayKey && !selectedDay && "ring-1 ring-[var(--color-primary)]",
              )}
              onClick={() => onSelectDay(day)}
              aria-pressed={selectedDay}
              aria-label={dayLabels.format(date)}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface EdgeDateTypeFieldProps {
  id: string;
  value: DateEdgeType;
  onValueChange: (value: DateEdgeType) => void;
}

export function EdgeDateTypeField({ id, value, onValueChange }: EdgeDateTypeFieldProps) {
  return (
    <div className="mt-5">
      <Label className="block text-xs" htmlFor={id}>
        Edge
      </Label>
      <Select
        value={value}
        disabled={!allowEdgeDateChoice()}
        onValueChange={(nextValue) => {
          if (nextValue === "inclusive" || nextValue === "exclusive") onValueChange(nextValue);
        }}
      >
        <SelectTrigger id={id} className="mt-1.5">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {dateEdgeTypeValues.map((edgeDateType) => (
            <SelectItem key={edgeDateType} value={edgeDateType}>
              {DATE_EDGE_LABEL[edgeDateType]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

interface DatePickerProps {
  id: string;
  label?: string;
  value: string | undefined;
  onChange: (nextValue: string | undefined) => void;
  edgeDateType?: DateEdgeType;
  onEdgeDateTypeChange?: (nextValue: DateEdgeType) => void;
  onEdgeValueChange?: (nextValue: DateEdgeValue | undefined) => void;
  description?: string;
  placeholder?: string;
}

export function DatePicker({
  id,
  label,
  value,
  onChange,
  edgeDateType = "inclusive",
  onEdgeDateTypeChange,
  onEdgeValueChange,
  description = "Select the date for this field.",
  placeholder = "Choose date",
}: DatePickerProps) {
  const { titleId, descriptionId } = useDialogIds();
  const accessibleLabel = label ?? placeholder;
  const selectedDate = parseDateValue(value);
  const initialDraft = selectedDate ?? new Date();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Date | undefined>(selectedDate);
  const [draftEdgeDateType, setDraftEdgeDateType] = useState<DateEdgeType>(edgeDateType);
  const [month, setMonth] = useState(
    () => new Date(initialDraft.getFullYear(), initialDraft.getMonth(), 1),
  );

  function openPicker() {
    const nextDraft = parseDateValue(value) ?? new Date();
    setDraft(parseDateValue(value));
    setDraftEdgeDateType(edgeDateType);
    setMonth(new Date(nextDraft.getFullYear(), nextDraft.getMonth(), 1));
    setOpen(true);
  }

  function selectDay(day: number) {
    setDraft(new Date(month.getFullYear(), month.getMonth(), day));
  }

  return (
    <div className={label ? "min-h-[74px]" : undefined}>
      {label ? <Label htmlFor={id}>{label}</Label> : null}
      <Button
        id={id}
        type="button"
        variant="secondary"
        size="md"
        className={
          label ? "mt-1.5 w-full justify-start font-normal" : "w-full justify-start font-normal"
        }
        aria-label={accessibleLabel}
        leadingIcon={<CalendarDays size={15} aria-hidden="true" />}
        onClick={openPicker}
      >
        <span className={value ? "text-[var(--color-text)]" : "text-[var(--color-text-faint)]"}>
          {value ? formatDateValue(value) : placeholder}
        </span>
      </Button>
      {label ? <span className="mt-1 block min-h-5" aria-hidden="true" /> : null}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        titleId={titleId}
        descriptionId={descriptionId}
        className="max-w-[440px] p-6"
      >
        <DialogTitle id={titleId} className="tracking-[-0.02em]">
          {accessibleLabel}
        </DialogTitle>
        <DialogDescription id={descriptionId}>{description}</DialogDescription>
        <div className="mt-5">
          <CalendarGrid
            month={month}
            selected={draft}
            onMonthChange={setMonth}
            onSelectDay={selectDay}
          />
        </div>
        <EdgeDateTypeField
          id={`${id}-edge`}
          value={draftEdgeDateType}
          onValueChange={setDraftEdgeDateType}
        />
        <div className="mt-5 flex items-center justify-between gap-2 border-t border-[var(--color-border)] pt-4">
          <Button variant="ghost" size="sm" onClick={() => setDraft(undefined)}>
            Clear
          </Button>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                const nextValue = draft ? toDateKey(draft) : undefined;
                if (onEdgeValueChange) {
                  onEdgeValueChange(toDateEdgeValue(nextValue, draftEdgeDateType));
                } else {
                  onChange(nextValue);
                  onEdgeDateTypeChange?.(draftEdgeDateType);
                }
                setOpen(false);
              }}
            >
              Apply date
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
