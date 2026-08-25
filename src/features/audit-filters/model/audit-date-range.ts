export const auditDatePresets = ["last24Hours", "last7Days", "last30Days"] as const;

export type AuditDatePreset = (typeof auditDatePresets)[number];

const presetHours: Record<AuditDatePreset, number> = {
  last24Hours: 24,
  last7Days: 24 * 7,
  last30Days: 24 * 30,
};

const HOUR_IN_MS = 60 * 60 * 1000;

/**
 * A preset resolves to an absolute instant rather than a named window, so the URL a person
 * shares means the same thing tomorrow. It pins only the lower bound of the half-open
 * `[from, to)` range — an investigation started an hour ago still wants the events since.
 */
export function auditPresetRange(
  preset: AuditDatePreset,
  now: Date = new Date(),
): { occurredFrom: string; occurredTo: undefined } {
  return {
    occurredFrom: new Date(now.getTime() - presetHours[preset] * HOUR_IN_MS).toISOString(),
    occurredTo: undefined,
  };
}

/** The `datetime-local` value for an instant, in the reader's own zone. */
export function toDateTimeLocalValue(instant: string | undefined): string {
  if (!instant) return "";
  const date = new Date(instant);
  if (Number.isNaN(date.getTime())) return "";

  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * The instant a `datetime-local` value names. The control carries no zone, so the browser
 * reads it in the reader's own; `toISOString` then gives the contract its explicit offset.
 */
export function fromDateTimeLocalValue(value: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}
