// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";
import type { components } from "@/shared/api";
import { apiClient } from "@/shared/api";
import { fetchPlatformAuditTrail, platformAuditEventTypes } from "./audit";

type PlatformEvent = components["schemas"]["PlatformAuditTrailPage"]["items"][number];

const platformReadEvent: PlatformEvent = {
  eventType: "audit.trail.platform_read",
  eventVersion: 1,
  occurredAt: "2026-08-13T10:00:00.000Z",
  scope: "PLATFORM",
  companyPublicId: null,
  outcome: "SUCCESS",
  actor: { kind: "USER", publicId: "550e8400-e29b-41d4-a716-446655440000" },
  traceId: "5fc21e3361b0fe234353b1176c5b2fdf",
  origin: { ip: "203.0.113.10", userAgent: null },
  targets: [{ targetType: "audit-trail", publicId: "platform" }],
  details: { companyPublicId: null, scope: null },
};

const page: components["schemas"]["PlatformAuditTrailPage"] = {
  items: [platformReadEvent],
  nextCursor: "opaque-next",
  hasMore: true,
};

describe("platformAuditEventTypes", () => {
  it("offers every catalog event the Platform trail admits, and only those", () => {
    expect(platformAuditEventTypes).toHaveLength(60);
    expect(platformAuditEventTypes).toContain("audit.trail.platform_read");
    expect(platformAuditEventTypes).not.toContain("audit.event.unavailable");
  });
});

describe("fetchPlatformAuditTrail", () => {
  afterEach(() => vi.restoreAllMocks());

  it("calls the real Platform endpoint and forwards cursor/limit/company/scope", async () => {
    const get = mockAuditResponse(page);

    await fetchPlatformAuditTrail({ cursor: "opaque-prev", limit: 25, scope: "PLATFORM" });

    const call = get.mock.calls[0];
    expect(call?.[0]).toBe("platform/audit-trail");
    expect(requestedSearch(get)).toBe("cursor=opaque-prev&limit=25&scope=PLATFORM");
  });

  it("repeats the event type once per selected value alongside the other filters", async () => {
    const get = mockAuditResponse(page);

    await fetchPlatformAuditTrail({
      outcome: "FAILURE",
      eventType: ["auth.session.started", "auth.session.ended"],
    });

    expect(requestedSearch(get)).toBe(
      "outcome=FAILURE&eventType=auth.session.started&eventType=auth.session.ended",
    );
  });

  it("returns the parsed page with the opaque cursor preserved", async () => {
    mockAuditResponse(page);

    const parsed = await fetchPlatformAuditTrail({});
    expect(parsed.items).toHaveLength(1);
    expect(parsed.nextCursor).toBe("opaque-next");
    expect(parsed.hasMore).toBe(true);
  });

  it("throws when the response is not a valid Audit Trail page", async () => {
    mockAuditResponse({ items: "not-an-array" });

    await expect(fetchPlatformAuditTrail({})).rejects.toThrow();
  });
});

function requestedSearch(get: ReturnType<typeof mockAuditResponse>): string {
  const options = get.mock.calls[0]?.[1] as { searchParams: URLSearchParams };
  return options.searchParams.toString();
}

function mockAuditResponse(response: unknown) {
  // Ky's response exposes more methods than this network-seam test exercises.
  return vi.spyOn(apiClient, "get").mockReturnValue({
    json: async () => response,
  } as never);
}
