import { describe, expect, it } from "vitest";
import { keyAuditRecords } from "./use-audit-row-expansion";

describe("keyAuditRecords", () => {
  it("disambiguates otherwise identical audit records", () => {
    const event = {
      eventType: "auth.session.started",
      occurredAt: "2026-08-18T09:12:34.000Z",
      traceId: null,
    };

    const records = keyAuditRecords([event, event]);

    expect(records[0]?.rowKey).not.toBe(records[1]?.rowKey);
  });
});
