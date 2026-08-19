import { render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { AuditEventRow } from "./audit-event-row";

type AuditEventRowEvent = ComponentProps<typeof AuditEventRow>["event"];

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

  it("renders a catalog event with no authored label as its raw event type", () => {
    // A label can only go missing for an event type the contract carries and the namespace
    // does not, which the generated union has no way to express — so the row is handed one.
    const unlabelled = {
      ...baseEvent,
      actor: { kind: "SYSTEM", component: "scheduler" },
      eventType: "company.lifecycle.renamed",
    } as unknown as AuditEventRowEvent;

    render(
      <table>
        <tbody>
          <AuditEventRow
            event={unlabelled}
            density="comfortable"
            expanded={false}
            detailId="detail-unlabelled"
            columnCount={4}
            locale="en"
            subjectFallback="Company"
            onToggle={vi.fn()}
          />
        </tbody>
      </table>,
    );

    const label = screen.getByText("company.lifecycle.renamed");
    expect(label).toBeInTheDocument();
    expect(label.className).toContain("font-mono");
  });
});
