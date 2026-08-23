import { describe, expect, it } from "vitest";
import { auditPresetRange, fromDateTimeLocalValue, toDateTimeLocalValue } from "./audit-date-range";

describe("auditPresetRange", () => {
  it("pins only the lower bound, as an absolute instant with an explicit offset", () => {
    const range = auditPresetRange("last7Days", new Date("2026-08-19T12:00:00.000Z"));

    expect(range).toEqual({ occurredFrom: "2026-08-12T12:00:00.000Z", occurredTo: undefined });
  });
});

describe("datetime-local round trip", () => {
  it("returns an instant carrying an explicit offset", () => {
    const instant = fromDateTimeLocalValue("2026-08-19T13:45");

    expect(instant).toMatch(/Z$/);
    expect(toDateTimeLocalValue(instant)).toBe("2026-08-19T13:45");
  });

  it("reads an absent or unparsable value as no bound", () => {
    expect(fromDateTimeLocalValue("")).toBeUndefined();
    expect(fromDateTimeLocalValue("not-a-date")).toBeUndefined();
    expect(toDateTimeLocalValue(undefined)).toBe("");
  });
});
