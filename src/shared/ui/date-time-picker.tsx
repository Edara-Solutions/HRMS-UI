import { CalendarDays } from "lucide-react";
import { useState } from "react";
import { Button } from "./button";
import { CalendarGrid, parseDateValue } from "./date-picker";
import { Dialog, DialogDescription, DialogTitle, useDialogIds } from "./dialog";
import { Input } from "./input";
import { Label } from "./label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";

const FILTER_DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});

export type DateTimeBoundary = "from" | "to";

function formatDateTimeValue(value: string | undefined): string {
  const date = parseDateValue(value);
  if (!date) return "Choose date and time";
  return FILTER_DATE_TIME_FORMATTER.format(date);
}

function toTwelveHour(hour: number): number {
  return hour % 12 || 12;
}

function timePeriod(hour: number): "AM" | "PM" {
  return hour < 12 ? "AM" : "PM";
}

interface DateTimePickerProps {
  id: string;
  label: string;
  value: string | undefined;
  onChange: (nextValue: string | undefined) => void;
  boundary?: DateTimeBoundary;
  description?: string;
  placeholder?: string;
}

export function DateTimePicker({
  id,
  label,
  value,
  onChange,
  boundary = "from",
  description = "Select the date and time for this field.",
  placeholder = "Choose date and time",
}: DateTimePickerProps) {
  const { titleId, descriptionId } = useDialogIds();
  const parsedValue = parseDateValue(value);
  const initialDraft = parsedValue ?? new Date();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Date | undefined>(parsedValue);
  const [minuteInput, setMinuteInput] = useState(() => String(initialDraft.getMinutes()));
  const [month, setMonth] = useState(
    () => new Date(initialDraft.getFullYear(), initialDraft.getMonth(), 1),
  );

  function defaultDraft(): Date {
    const nextDraft = new Date();
    nextDraft.setHours(boundary === "from" ? 0 : 23, boundary === "from" ? 0 : 59, 0, 0);
    return nextDraft;
  }

  function openPicker() {
    const nextDraft = parseDateValue(value) ?? defaultDraft();
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
    <div className="min-h-[74px]">
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
          {value ? formatDateTimeValue(value) : placeholder}
        </span>
      </Button>
      <span className="mt-1 block min-h-5" aria-hidden="true" />
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
        <DialogDescription id={descriptionId}>{description}</DialogDescription>
        <div className="mt-5">
          <CalendarGrid
            month={month}
            selected={draft}
            onMonthChange={setMonth}
            onSelectDay={selectDay}
          />
        </div>
        <div className="mt-5 grid grid-cols-3 gap-3">
          <div>
            <Label className="block text-xs" htmlFor={`${id}-hour`}>
              Hour
            </Label>
            <Select
              value={draft ? String(toTwelveHour(draft.getHours())) : ""}
              onValueChange={updateHour}
            >
              <SelectTrigger id={`${id}-hour`} className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, index) => index + 1).map((hour) => (
                  <SelectItem key={hour} value={String(hour)}>
                    {String(hour).padStart(2, "0")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="block text-xs" htmlFor={`${id}-minute`}>
              Minute
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
              00-59
            </span>
          </div>
          <div>
            <Label className="block text-xs" htmlFor={`${id}-period`}>
              AM / PM
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
            }}
          >
            Clear
          </Button>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                onChange(draft?.toISOString());
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
