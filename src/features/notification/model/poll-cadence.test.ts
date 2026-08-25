import { describe, expect, it } from "vitest";
import { IDLE_POLL_INTERVAL_MS, resolvePollIntervalMs } from "./poll-cadence";

describe("resolvePollIntervalMs", () => {
  it("falls back to the idle cadence when the server sends no usable header", () => {
    expect(resolvePollIntervalMs(null)).toBe(IDLE_POLL_INTERVAL_MS);
    expect(resolvePollIntervalMs("")).toBe(IDLE_POLL_INTERVAL_MS);
    expect(resolvePollIntervalMs("0")).toBe(IDLE_POLL_INTERVAL_MS);
    expect(resolvePollIntervalMs("-30")).toBe(IDLE_POLL_INTERVAL_MS);
    expect(resolvePollIntervalMs("soon")).toBe(IDLE_POLL_INTERVAL_MS);
  });

  it("takes the server's cadence whenever it sends one, faster or slower than idle", () => {
    expect(resolvePollIntervalMs("10")).toBe(10_000);
    expect(resolvePollIntervalMs("2")).toBe(2_000);
    expect(resolvePollIntervalMs("120")).toBe(120_000);
  });
});
