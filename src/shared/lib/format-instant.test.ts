import { describe, expect, it } from "vitest";
import type { SupportedLocale } from "@/shared/i18n";
import { formatElapsed, formatFullInstant, formatInstant } from "./format-instant";

function localInstant(year: number, month: number, day: number, hour: number, minute = 0): string {
  return new Date(year, month, day, hour, minute).toISOString();
}

describe("formatInstant", () => {
  const now = new Date(2026, 7, 19, 15, 0, 30);

  it("uses just now for instants less than a minute away", () => {
    expect(formatInstant(new Date(now.getTime() - 30_000).toISOString(), "en", { now })).toBe(
      "just now",
    );
  });

  it("uses relative labels today and yesterday", () => {
    expect(formatInstant(localInstant(2026, 7, 19, 14, 22), "en", { now })).toMatch(
      /^Today, 2:22 pm$/,
    );
    expect(formatInstant(localInstant(2026, 7, 18, 16, 38), "en", { now })).toMatch(
      /^Yesterday, 4:38 pm$/,
    );
  });

  it("omits the year within this year and includes it for older instants", () => {
    expect(formatInstant(localInstant(2026, 4, 18, 9, 12), "en", { now })).toBe("18 May, 9:12 am");
    expect(formatInstant(localInstant(2025, 4, 18, 9, 12), "en", { now })).toBe(
      "18 May 2025, 9:12 am",
    );
  });

  it("renders midnight and noon with lowercase am and pm", () => {
    expect(formatInstant(localInstant(2026, 7, 18, 0), "en", { now })).toContain("12:00 am");
    expect(formatInstant(localInstant(2026, 7, 18, 12), "en", { now })).toContain("12:00 pm");
  });
});

describe("formatFullInstant", () => {
  it("includes seconds and an explicit local timezone", () => {
    const formatted = formatFullInstant(localInstant(2026, 7, 18, 9, 12), "en");

    expect(formatted).toMatch(/9:12:00 am/);
    expect(formatted.replace("9:12:00 am", "")).toMatch(/[A-Za-z]{2,}/);
  });
});

describe("formatElapsed", () => {
  const occurredAt = "2026-08-12T09:30:00.000Z";

  function elapsed(milliseconds: number, locale: SupportedLocale = "en") {
    return formatElapsed(
      occurredAt,
      new Date(Date.parse(occurredAt) + milliseconds).toISOString(),
      locale,
    );
  }

  it("stays quiet below a second, where the gap says nothing about the recording", () => {
    expect(elapsed(0)).toBeNull();
    expect(elapsed(999)).toBeNull();
    expect(elapsed(-5_000)).toBeNull();
  });

  it("names the gap in the largest unit that still counts whole", () => {
    expect(elapsed(4_000)).toBe("4 seconds");
    expect(elapsed(1_000)).toBe("1 second");
    expect(elapsed(90_000)).toBe("1 minute");
    expect(elapsed(3 * 3_600_000)).toBe("3 hours");
    expect(elapsed(50 * 3_600_000)).toBe("2 days");
  });

  it("answers with nothing when either instant is unreadable", () => {
    expect(formatElapsed("not-an-instant", occurredAt, "en")).toBeNull();
    expect(formatElapsed(occurredAt, "not-an-instant", "en")).toBeNull();
  });
});
