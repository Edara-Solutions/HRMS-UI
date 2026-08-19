import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AuditEventRow } from "./audit-event-row";

const baseEvent = {
  eventType: "auth.session.started" as const,
  eventVersion: 1 as const,
  occurredAt: "2026-08-18T09:12:34.000Z",
  outcome: "SUCCESS" as const,
  traceId: null,
  targets: [],
  details: {},
};

describe("AuditEventRow", () => {
  it("keeps all three unnamed actor states distinct", () => {
    const actors = [
      { kind: "ANONYMOUS" as const },
      { kind: "ATTRIBUTION_FAILED" as const },
      { kind: "ERASED_USER" as const },
    ];

    render(
      <table>
        <tbody>
          {actors.map((actor, index) => (
            <AuditEventRow
              key={actor.kind}
              event={{ ...baseEvent, actor }}
              density="comfortable"
              expanded={false}
              detailId={`detail-${index}`}
              columnCount={4}
              locale="en"
              subjectFallback="Company"
              onToggle={vi.fn()}
            />
          ))}
        </tbody>
      </table>,
    );

    expect(screen.getByText("Anonymous")).toBeInTheDocument();
    expect(screen.getByText("Attribution failed")).toBeInTheDocument();
    expect(screen.getByText("Erased identity")).toBeInTheDocument();
  });
});
