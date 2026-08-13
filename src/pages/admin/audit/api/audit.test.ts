// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { components } from "@/shared/api";
import { apiClient } from "@/shared/api";
import { usePlatformAuditTrail } from "./audit";

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

describe("fetchPlatformAuditTrail", () => {
  beforeEach(() => {
    vi.spyOn(apiClient, "get").mockReturnValue({
      json: async () => page,
    } as never);
  });

  afterEach(() => vi.restoreAllMocks());

  it("calls the real Platform endpoint and forwards cursor/limit/company/scope", async () => {
    await usePlatformAuditTrailQuery({ cursor: "opaque-prev", limit: 25, scope: "PLATFORM" });

    const call = (apiClient.get as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call?.[0]).toBe("platform/audit-trail");
    expect(call?.[1]).toMatchObject({
      searchParams: { cursor: "opaque-prev", limit: "25", scope: "PLATFORM" },
    });
  });

  it("returns the parsed page with the opaque cursor preserved", async () => {
    const parsed = await usePlatformAuditTrailQuery({});
    expect(parsed.items).toHaveLength(1);
    expect(parsed.nextCursor).toBe("opaque-next");
    expect(parsed.hasMore).toBe(true);
  });

  it("throws when the response is not a valid Audit Trail page", async () => {
    vi.spyOn(apiClient, "get").mockReturnValue({
      json: async () => ({ items: "not-an-array" }),
    } as never);

    await expect(usePlatformAuditTrailQuery({})).rejects.toThrow();
  });
});

async function usePlatformAuditTrailQuery(params: {
  cursor?: string;
  limit?: number;
  companyPublicId?: string;
  scope?: "PLATFORM" | "COMPANY";
}) {
  const { fetchPlatformAuditTrail } = await import("./audit");
  return fetchPlatformAuditTrail(params);
}