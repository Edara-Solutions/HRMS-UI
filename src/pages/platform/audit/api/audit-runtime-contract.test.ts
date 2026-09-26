// @vitest-environment node

import { describe, expect, it } from "vitest";
import { parsePlatformAuditTrailPage } from "./audit-runtime-contract";

const platformReadEvent = {
  eventType: "audit.trail.platform_read",
  eventVersion: 1,
  occurredAt: "2026-08-13T10:00:00.000Z",
  scope: "PLATFORM",
  companyPublicId: null,
  outcome: "SUCCESS",
  actor: { kind: "USER", publicId: "550e8400-e29b-41d4-a716-446655440000", name: "Layla Hassan" },
  traceId: "5fc21e3361b0fe234353b1176c5b2fdf",
  origin: { ip: "203.0.113.10", userAgent: "curl/8" },
  targets: [{ targetType: "audit-trail", publicId: "platform" }],
  details: { companyPublicId: null, scope: null },
  recordingBinding: "STANDALONE",
  recordedAt: "2026-08-13T10:00:04.000Z",
};

const unavailableEvent = {
  eventType: "audit.event.unavailable",
  eventVersion: 1,
  occurredAt: "2026-08-13T10:01:00.000Z",
  reason: "UNSUPPORTED_OR_DAMAGED",
};

describe("parsePlatformAuditTrailPage", () => {
  it("returns the page when both normal and unavailable events are present", () => {
    const page = {
      items: [platformReadEvent, unavailableEvent],
      nextCursor: "opaque-cursor-token",
      hasMore: true,
    };

    const parsed = parsePlatformAuditTrailPage(page);

    expect(parsed.items).toHaveLength(2);
    expect(parsed.items[0]?.eventType).toBe("audit.trail.platform_read");
    expect(parsed.items[1]?.eventType).toBe("audit.event.unavailable");
    expect(parsed.nextCursor).toBe("opaque-cursor-token");
    expect(parsed.hasMore).toBe(true);
  });

  it("rejects a page missing required envelope fields", () => {
    expect(() =>
      parsePlatformAuditTrailPage({ items: [platformReadEvent], hasMore: false }),
    ).toThrow();
  });

  it("degrades an unknown event while preserving its raw payload and valid siblings", () => {
    const unknownEvent = { ...platformReadEvent, eventType: "audit.trail.unknown_event" };
    const page = {
      items: [platformReadEvent, unknownEvent],
      nextCursor: null,
      hasMore: false,
    };

    const parsed = parsePlatformAuditTrailPage(page);

    expect(parsed.items[0]?.eventType).toBe("audit.trail.platform_read");
    expect(parsed.items[1]).toEqual({ eventType: "__unrecognized__", raw: unknownEvent });
  });

  it("degrades a known event with a malformed payload", () => {
    const malformedEvent = { ...platformReadEvent, actor: { kind: "USER" } };

    const parsed = parsePlatformAuditTrailPage({
      items: [malformedEvent],
      nextCursor: null,
      hasMore: false,
    });

    expect(parsed.items[0]).toEqual({ eventType: "__unrecognized__", raw: malformedEvent });
  });

  it("accepts the generated anonymous actor discriminator", () => {
    const page = {
      items: [{ ...platformReadEvent, actor: { kind: "ANONYMOUS" } }],
      nextCursor: null,
      hasMore: false,
    };

    expect(parsePlatformAuditTrailPage(page).items[0]?.eventType).toBe("audit.trail.platform_read");
  });

  it("degrades an event with the wrong version", () => {
    const page = {
      items: [{ ...platformReadEvent, eventVersion: 2 }],
      nextCursor: null,
      hasMore: false,
    };

    expect(parsePlatformAuditTrailPage(page).items[0]?.eventType).toBe("__unrecognized__");
  });

  it("degrades a Platform event carrying Company scope", () => {
    const page = {
      items: [{ ...platformReadEvent, scope: "COMPANY" }],
      nextCursor: null,
      hasMore: false,
    };

    expect(parsePlatformAuditTrailPage(page).items[0]?.eventType).toBe("__unrecognized__");
  });
});
