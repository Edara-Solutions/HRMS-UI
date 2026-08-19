import { describe, expect, it } from "vitest";
import { formatFullInstant, formatInstant } from "./format-instant";

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
