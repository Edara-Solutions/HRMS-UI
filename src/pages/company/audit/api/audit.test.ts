// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";
import type { components } from "@/shared/api";
import { apiClient } from "@/shared/api";
import { fetchCompanyAuditTrail } from "./audit";

const page: components["schemas"]["CompanyAuditTrailPage"] = {
  items: [
    {
      eventType: "company.profile.completed",
      eventVersion: 1,
      occurredAt: "2026-08-13T10:00:00.000Z",
      outcome: "SUCCESS",
      actor: { kind: "USER", publicId: "550e8400-e29b-41d4-a716-446655440000" },
      traceId: "5fc21e3361b0fe234353b1176c5b2fdf",
      targets: [{ targetType: "company-profile", publicId: "profile-1" }],
      details: { beforeStatus: "INCOMPLETE", afterStatus: "COMPLETE" },
    },
  ],
  nextCursor: "opaque-next",
  hasMore: true,
};

describe("fetchCompanyAuditTrail", () => {
  afterEach(() => vi.restoreAllMocks());

  it("calls the Company route and forwards only cursor and limit", async () => {
    const get = mockAuditResponse(page);

    await fetchCompanyAuditTrail({ cursor: "opaque-prev", limit: 25 });

    const call = get.mock.calls[0];
    expect(call?.[0]).toBe("company/audit-trail");
    expect(call?.[1]).toMatchObject({ searchParams: { cursor: "opaque-prev", limit: "25" } });
  });

  it("asks for the first page when no paging input is given", async () => {
    const get = mockAuditResponse(page);

    await fetchCompanyAuditTrail({});

    expect(get.mock.calls[0]?.[1]).toMatchObject({ searchParams: {} });
  });

  it("returns the parsed page with the opaque cursor preserved", async () => {
    mockAuditResponse(page);

    const parsed = await fetchCompanyAuditTrail({});

    expect(parsed.items).toHaveLength(1);
    expect(parsed.nextCursor).toBe("opaque-next");
    expect(parsed.hasMore).toBe(true);
  });

  it("throws when the response is not a valid Company Audit Trail page", async () => {
    mockAuditResponse({ items: "not-an-array" });

    await expect(fetchCompanyAuditTrail({})).rejects.toThrow();
  });
});

function mockAuditResponse(response: unknown) {
  // Ky's response exposes more methods than this network-seam test exercises.
  return vi.spyOn(apiClient, "get").mockReturnValue({
    json: async () => response,
  } as never);
}
