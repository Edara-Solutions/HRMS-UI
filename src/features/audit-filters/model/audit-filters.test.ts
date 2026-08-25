import { describe, expect, it } from "vitest";
import {
  type AuditOutcome,
  appendAuditFilterParams,
  applyAuditFilterChange,
  hasAuditFilters,
} from "./audit-filters";

describe("applyAuditFilterChange", () => {
  it("drops the cursor whenever a filter changes", () => {
    const next = applyAuditFilterChange(
      { cursor: "opaque-current", limit: 50, outcome: "SUCCESS" as AuditOutcome },
      { outcome: "FAILURE" },
    );

    expect(next).toEqual({ cursor: undefined, limit: 50, outcome: "FAILURE" });
  });

  it("drops the cursor even when the change clears a filter", () => {
    const next = applyAuditFilterChange(
      { cursor: "opaque-current", actorPublicId: "actor-1" as string | undefined },
      { actorPublicId: undefined },
    );

    expect(next.cursor).toBeUndefined();
  });
});

describe("appendAuditFilterParams", () => {
  it("repeats eventType once per selected value and sends the rest as single params", () => {
    const searchParams = new URLSearchParams();

    appendAuditFilterParams(searchParams, {
      occurredFrom: "2026-08-01T00:00:00.000Z",
      occurredTo: "2026-08-19T00:00:00.000Z",
      actorPublicId: "550e8400-e29b-41d4-a716-446655440000",
      outcome: "FAILURE",
      eventType: ["auth.session.started", "auth.session.ended"],
    });

    expect(searchParams.toString()).toBe(
      "occurredFrom=2026-08-01T00%3A00%3A00.000Z&occurredTo=2026-08-19T00%3A00%3A00.000Z" +
        "&actorPublicId=550e8400-e29b-41d4-a716-446655440000&outcome=FAILURE" +
        "&eventType=auth.session.started&eventType=auth.session.ended",
    );
  });

  it("writes nothing for an empty filter set", () => {
    const searchParams = new URLSearchParams();

    appendAuditFilterParams(searchParams, { eventType: [] });

    expect(searchParams.toString()).toBe("");
    expect(hasAuditFilters({ eventType: [] })).toBe(false);
  });
});
