import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import type { SupportedLocale } from "@/shared/i18n";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogDescription, DialogTitle, useDialogIds } from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";

/** Which end of a range this picker sets — the time an empty picker opens on. */
export type DateBoundary = "from" | "to";

export interface DateTimePickerText {
  description: string;
  placeholder: string;
  hour: string;
  minute: string;
  minuteHint: string;
  period: string;
  previousMonth: string;
  nextMonth: string;
  clear: string;
  cancel: string;
  apply: string;
}

const defaultText: DateTimePickerText = {
  description: "Select the date and time.",
  placeholder: "Choose date and time",
  hour: "Hour",
  minute: "Minute",
  minuteHint: "00-59",
  period: "AM / PM",
  previousMonth: "Previous month",
  nextMonth: "Next month",
  clear: "Clear",
  cancel: "Cancel",
  apply: "Apply date",
};

const localeTags: Record<SupportedLocale, string> = {
  en: "en-GB",
  ar: "ar-SA-u-ca-gregory",
};

function chosenInstantText(value: string, locale: SupportedLocale): string {
  return new Intl.DateTimeFormat(localeTags[locale], {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(value));
}

function weekdayNames(locale: SupportedLocale): string[] {
  const formatter = new Intl.DateTimeFormat(localeTags[locale], { weekday: "short" });
  // 1 January 2024 was a Monday, and the grid starts its week there.
  return Array.from({ length: 7 }, (_unused, index) =>
    formatter.format(new Date(2024, 0, 1 + index)),
  );
}

function toTwelveHour(hour: number): number {
  return hour % 12 || 12;
}

function timePeriod(hour: number): "AM" | "PM" {
  return hour < 12 ? "AM" : "PM";
}

function toDateKey(value: Date): string {
  return [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, "0"),
    String(value.getDate()).padStart(2, "0"),
  ].join("-");
}

interface DateTimePickerProps {
  id: string;
  label: string;
  /** The chosen instant as ISO 8601 with an explicit offset; absent leaves the bound open. */
  value: string | undefined;
  boundary: DateBoundary;
  locale?: SupportedLocale;
  text?: Partial<DateTimePickerText>;
  onChange: (nextValue: string | undefined) => void;
}

/**
 * Picks one instant on a calendar rather than in a text field. What it reports is always
 * `toISOString()` — an explicit offset — so no reader downstream has to guess which zone a
 * wall clock belonged to.
 */
export function DateTimePicker({
  id,
  label,
  value,
  boundary,
  locale = "en",
  text,
  onChange,
}: DateTimePickerProps) {
  const { titleId, descriptionId } = useDialogIds();
  const copy = { ...defaultText, ...text };
  const initialDraft = value ? new Date(value) : new Date();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Date | undefined>(initialDraft);
  const [minuteInput, setMinuteInput] = useState(() => String(initialDraft.getMinutes()));
  const [month, setMonth] = useState(
    () => new Date(initialDraft.getFullYear(), initialDraft.getMonth(), 1),
  );
  const firstWeekday = (month.getDay() + 6) % 7;
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const selectedKey = draft ? toDateKey(draft) : undefined;
  const todayKey = toDateKey(new Date());
  const monthLabel = new Intl.DateTimeFormat(localeTags[locale], {
    month: "long",
    year: "numeric",
  }).format(month);
  const dayLabels = new Intl.DateTimeFormat(localeTags[locale], { dateStyle: "full" });

  function defaultDraft(): Date {
    const nextDraft = new Date();
    nextDraft.setHours(boundary === "from" ? 0 : 23, boundary === "from" ? 0 : 59, 0, 0);
    return nextDraft;
  }

  function openPicker() {
    const nextDraft = value ? new Date(value) : defaultDraft();
    setDraft(nextDraft);
    setMinuteInput(String(nextDraft.getMinutes()));
    setMonth(new Date(nextDraft.getFullYear(), nextDraft.getMonth(), 1));
    setOpen(true);
  }

  function selectDay(day: number) {
    setDraft((current) => {
      const source = current ?? defaultDraft();
      return new Date(
        month.getFullYear(),
        month.getMonth(),
        day,
        source.getHours(),
        source.getMinutes(),
      );
    });
  }

  function updateHour(nextValue: string) {
    setDraft((current) => {
      const source = current ?? defaultDraft();
      const next = new Date(source);
      const hour = Number(nextValue);
      const period = timePeriod(source.getHours());
      next.setHours(period === "AM" ? (hour === 12 ? 0 : hour) : hour === 12 ? 12 : hour + 12);
      return next;
    });
  }

  function updateMinutes(nextValue: string) {
    if (!/^\d{0,2}$/.test(nextValue)) return;
    setMinuteInput(nextValue);
    if (nextValue === "") return;
    const minutes = Number(nextValue);
    if (minutes > 59) return;
    setDraft((current) => {
      const next = new Date(current ?? defaultDraft());
      next.setMinutes(minutes);
      return next;
    });
  }

  function updatePeriod(period: "AM" | "PM") {
    setDraft((current) => {
      const source = current ?? defaultDraft();
      const next = new Date(source);
      const hour = toTwelveHour(source.getHours());
      next.setHours(period === "AM" ? (hour === 12 ? 0 : hour) : hour === 12 ? 12 : hour + 12);
      return next;
    });
  }

  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Button
        id={id}
        type="button"
        variant="secondary"
        size="md"
        className="mt-1.5 w-full justify-start font-normal"
        leadingIcon={<CalendarDays size={15} aria-hidden="true" />}
        onClick={openPicker}
      >
        <span className={value ? "text-[var(--color-text)]" : "text-[var(--color-text-faint)]"}>
          {value ? chosenInstantText(value, locale) : copy.placeholder}
        </span>
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        titleId={titleId}
        descriptionId={descriptionId}
        className="max-w-[440px] p-6"
      >
        <DialogTitle id={titleId} className="tracking-[-0.02em]">
          {label}
        </DialogTitle>
        <DialogDescription id={descriptionId}>{copy.description}</DialogDescription>
        <div className="mt-5 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="ghost"
              size="iconXs"
              aria-label={copy.previousMonth}
              onClick={() =>
                setMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))
              }
            >
              <ChevronLeft size={15} />
            </Button>
            <p className="text-[13px] font-semibold tracking-tight text-[var(--color-text)]">
              {monthLabel}
            </p>
            <Button
              variant="ghost"
              size="iconXs"
              aria-label={copy.nextMonth}
              onClick={() =>
                setMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))
              }
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
            {Array.from({ length: firstWeekday + daysInMonth }, (_unused, index) => {
              if (index < firstWeekday) return <span key={`blank-${index}`} />;
              const day = index - firstWeekday + 1;
              const date = new Date(month.getFullYear(), month.getMonth(), day);
              const dateKey = toDateKey(date);
              const selected = dateKey === selectedKey;
              return (
                <button
                  key={dateKey}
                  type="button"
                  className={cn(
                    "mx-auto flex size-9 items-center justify-center rounded-[var(--radius-md)] text-[13px] tabular-nums transition-colors duration-[var(--motion-fast)] ease-[var(--motion-easing)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]",
                    selected
                      ? "bg-[var(--color-primary-fill)] font-semibold text-[var(--color-on-primary)]"
                      : "font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]",
                    dateKey === todayKey && !selected && "ring-1 ring-[var(--color-primary)]",
                  )}
                  onClick={() => selectDay(day)}
                  aria-pressed={selected}
                  aria-label={dayLabels.format(date)}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-3">
          <div>
            <Label className="block text-xs" htmlFor={`${id}-hour`}>
              {copy.hour}
            </Label>
            <Select
              value={draft ? String(toTwelveHour(draft.getHours())) : ""}
              onValueChange={updateHour}
            >
              <SelectTrigger id={`${id}-hour`} className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_unused, index) => index + 1).map((hour) => (
                  <SelectItem key={hour} value={String(hour)}>
                    {String(hour).padStart(2, "0")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="block text-xs" htmlFor={`${id}-minute`}>
              {copy.minute}
            </Label>
            <Input
              id={`${id}-minute`}
              className="mt-1.5 tabular-nums"
              value={minuteInput}
              inputMode="numeric"
              maxLength={2}
              placeholder="00"
              aria-describedby={`${id}-minute-hint`}
              onChange={(event) => updateMinutes(event.target.value)}
              onBlur={() => {
                if (minuteInput === "" && draft) setMinuteInput(String(draft.getMinutes()));
              }}
            />
            <span
              id={`${id}-minute-hint`}
              className="mt-1 block text-[11px] text-[var(--color-text-faint)]"
            >
              {copy.minuteHint}
            </span>
          </div>
          <div>
            <Label className="block text-xs" htmlFor={`${id}-period`}>
              {copy.period}
            </Label>
            <Select
              value={draft ? timePeriod(draft.getHours()) : ""}
              onValueChange={(nextValue) => {
                if (nextValue === "AM" || nextValue === "PM") updatePeriod(nextValue);
              }}
            >
              <SelectTrigger id={`${id}-period`} className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AM">AM</SelectItem>
                <SelectItem value="PM">PM</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-5 flex items-center justify-between gap-2 border-t border-[var(--color-border)] pt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setDraft(undefined);
              setMinuteInput("");
              onChange(undefined);
              setOpen(false);
            }}
          >
            {copy.clear}
          </Button>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setOpen(false)}>
              {copy.cancel}
            </Button>
            <Button
              size="sm"
              onClick={() => {
                onChange(draft?.toISOString());
                setOpen(false);
              }}
            >
              {copy.apply}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
