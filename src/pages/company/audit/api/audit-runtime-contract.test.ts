// @vitest-environment node

import { describe, expect, it } from "vitest";
import { parseCompanyAuditTrailPage } from "./audit-runtime-contract";

const profileUpdatedEvent = {
  eventType: "company.profile.material_updated",
  eventVersion: 1,
  occurredAt: "2026-08-13T10:00:00.000Z",
  outcome: "SUCCESS",
  actor: { kind: "USER", publicId: "550e8400-e29b-41d4-a716-446655440000", name: "Layla Hassan" },
  traceId: "5fc21e3361b0fe234353b1176c5b2fdf",
  targets: [{ targetType: "company-profile", publicId: "profile-1" }],
  details: {
    changes: [{ field: "name", before: "Northwind", after: "Northwind Egypt" }],
  },
};

describe("parseCompanyAuditTrailPage", () => {
  it("returns the page for a Company Projection event", () => {
    const parsed = parseCompanyAuditTrailPage({
      items: [profileUpdatedEvent],
      nextCursor: "opaque-cursor-token",
      hasMore: true,
    });

    expect(parsed.items[0]?.eventType).toBe("company.profile.material_updated");
    expect(parsed.nextCursor).toBe("opaque-cursor-token");
    expect(parsed.hasMore).toBe(true);
  });

  it("returns the page for a profile completion event", () => {
    const parsed = parseCompanyAuditTrailPage({
      items: [
        {
          ...profileUpdatedEvent,
          eventType: "company.profile.completed",
          details: { beforeStatus: "INCOMPLETE", afterStatus: "COMPLETE" },
        },
      ],
      nextCursor: null,
      hasMore: false,
    });

    expect(parsed.items[0]?.eventType).toBe("company.profile.completed");
  });

  it("returns the page for history the reader can no longer project", () => {
    const parsed = parseCompanyAuditTrailPage({
      items: [
        {
          eventType: "audit.event.unavailable",
          eventVersion: 1,
          occurredAt: "2026-08-13T10:01:00.000Z",
          reason: "UNSUPPORTED_OR_DAMAGED",
        },
      ],
      nextCursor: null,
      hasMore: false,
    });

    expect(parsed.items[0]?.eventType).toBe("audit.event.unavailable");
  });

  it("degrades an unknown event while preserving its raw payload and valid siblings", () => {
    const unknownEvent = { ...profileUpdatedEvent, eventType: "company.profile.invented" };

    const parsed = parseCompanyAuditTrailPage({
      items: [profileUpdatedEvent, unknownEvent],
      nextCursor: null,
      hasMore: false,
    });

    expect(parsed.items[0]?.eventType).toBe("company.profile.material_updated");
    expect(parsed.items[1]).toEqual({ eventType: "__unrecognized__", raw: unknownEvent });
  });

  it("degrades a known event with a malformed payload", () => {
    const malformedEvent = { ...profileUpdatedEvent, actor: { kind: "USER" } };

    const parsed = parseCompanyAuditTrailPage({
      items: [malformedEvent],
      nextCursor: null,
      hasMore: false,
    });

    expect(parsed.items[0]).toEqual({ eventType: "__unrecognized__", raw: malformedEvent });
  });

  it("accepts a Platform Admin actor reported without an identity", () => {
    const parsed = parseCompanyAuditTrailPage({
      items: [{ ...profileUpdatedEvent, actor: { kind: "PLATFORM_ADMIN" } }],
      nextCursor: null,
      hasMore: false,
    });

    expect(parsed.items[0]?.eventType).toBe("company.profile.material_updated");
  });

  it.each([
    "scope",
    "companyPublicId",
    "origin",
  ])("degrades an event carrying the Platform-only %s field", (platformOnlyField) => {
    const parsed = parseCompanyAuditTrailPage({
      items: [{ ...profileUpdatedEvent, [platformOnlyField]: "PLATFORM" }],
      nextCursor: null,
      hasMore: false,
    });

    expect(parsed.items[0]?.eventType).toBe("__unrecognized__");
  });

  it("degrades an event stored under an unsupported version", () => {
    const parsed = parseCompanyAuditTrailPage({
      items: [{ ...profileUpdatedEvent, eventVersion: 2 }],
      nextCursor: null,
      hasMore: false,
    });

    expect(parsed.items[0]?.eventType).toBe("__unrecognized__");
  });

  it("rejects a page missing the hasMore indicator", () => {
    expect(() =>
      parseCompanyAuditTrailPage({ items: [profileUpdatedEvent], nextCursor: null }),
    ).toThrow();
  });

  it("degrades a Platform Admin actor carrying a public identifier", () => {
    const parsed = parseCompanyAuditTrailPage({
      items: [
        {
          ...profileUpdatedEvent,
          actor: {
            kind: "PLATFORM_ADMIN",
            publicId: "550e8400-e29b-41d4-a716-446655440000",
          },
        },
      ],
      nextCursor: null,
      hasMore: false,
    });

    expect(parsed.items[0]?.eventType).toBe("__unrecognized__");
  });
});
