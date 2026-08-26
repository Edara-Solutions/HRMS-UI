import { render, screen } from "@testing-library/react";
import type { ComponentProps, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { AuditEventRow } from "./audit-event-row";

// The row is rendered outside a router here, so `Link` stands in as the anchor it becomes.
vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    params,
    children,
    ...props
  }: {
    to: string;
    params: { publicId: string };
    children: ReactNode;
  }) => (
    <a href={to.replace("$publicId", params.publicId)} {...props}>
      {children}
    </a>
  ),
}));

type AuditEventRowEvent = ComponentProps<typeof AuditEventRow>["event"];

const baseEvent = {
  eventType: "auth.session.started" as const,
  eventVersion: 1 as const,
  occurredAt: "2026-08-18T09:12:34.000Z",
  outcome: "SUCCESS" as const,
  actor: { kind: "SYSTEM" as const, component: "SCHEDULER" as const },
  traceId: null,
  targets: [],
  details: {},
};

type RenderRowProps = Partial<ComponentProps<typeof AuditEventRow>> &
  Pick<ComponentProps<typeof AuditEventRow>, "event">;

function renderRow(props: RenderRowProps) {
  return render(
    <table>
      <tbody>
        <AuditEventRow
          portal="admin"
          density="comfortable"
          expanded={false}
          detailId="detail"
          columnCount={4}
          locale="en"
          subjectFallback="Company"
          onToggle={vi.fn()}
          {...props}
        />
      </tbody>
    </table>,
  );
}

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
              portal="admin"
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
            portal="admin"
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
  it("marks a user whose name did not resolve with a truncated id, never a blank cell", () => {
    renderRow({
      event: {
        ...baseEvent,
        actor: { kind: "USER", publicId: "6f1d9c22-0f4e-4c33-9a5b-2d1c8e77b410", name: null },
      },
    });

    expect(screen.getByText("6f1d9c22…")).toBeInTheDocument();
    expect(screen.getByText("Unresolved")).toBeInTheDocument();
  });

  it("reads an unattributed event as a defect", () => {
    renderRow({ event: { ...baseEvent, actor: { kind: "ATTRIBUTION_FAILED" } } });

    expect(screen.getByText("Attribution failed")).toBeInTheDocument();
    expect(screen.getByText("Defect")).toBeInTheDocument();
  });

  it("names the component behind a system actor", () => {
    renderRow({ event: { ...baseEvent, actor: { kind: "SYSTEM", component: "EMAIL_WORKER" } } });

    expect(screen.getByText("Email worker")).toBeInTheDocument();
    expect(screen.getByText("System")).toBeInTheDocument();
  });

  it("renders the Company trail's platform admin as a constant carrying no name or id", () => {
    const { container } = renderRow({
      portal: "company",
      event: { ...baseEvent, actor: { kind: "PLATFORM_ADMIN" } },
    });

    expect(screen.getByText("Platform admin")).toBeInTheDocument();
    expect(screen.getByText("Identity withheld")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Filter by this actor/ })).not.toBeInTheDocument();
    // The Company arm has no identity fields, so nothing that could name the admin is on screen.
    expect(container.textContent).not.toMatch(/[0-9a-f]{8}/i);
  });

  it("does not label an identifierless user as the withheld platform admin", () => {
    // Only PLATFORM_ADMIN legitimately arrives without an id; any other kind is a defect.
    renderRow({
      event: { ...baseEvent, actor: { kind: "USER" } },
    });

    expect(screen.queryByText("Platform admin")).not.toBeInTheDocument();
    expect(screen.getByText("Attribution failed")).toBeInTheDocument();
  });

  it("links a named company target on the admin trail", () => {
    renderRow({
      event: {
        ...baseEvent,
        targets: [{ targetType: "company", publicId: "company-1", name: "Nexus Technologies" }],
      },
    });

    expect(screen.getByRole("link", { name: "Nexus Technologies" })).toHaveAttribute(
      "href",
      "/admin/companies/company-1",
    );
  });

  it("offers the Company trail no target link at all", () => {
    renderRow({
      portal: "company",
      event: {
        ...baseEvent,
        targets: [{ targetType: "company", publicId: "company-1", name: "Nexus Technologies" }],
      },
    });

    expect(screen.getByText("Nexus Technologies")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("renders an erased target as erased rather than truncating its sentinel", () => {
    renderRow({
      event: { ...baseEvent, targets: [{ targetType: "user", publicId: "ERASED" }] },
    });

    expect(screen.getByText("Erased subject")).toBeInTheDocument();
    expect(screen.queryByText("ERASED…")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("renders an unknown target type as plain text without throwing", () => {
    expect(() =>
      renderRow({
        event: { ...baseEvent, targets: [{ targetType: "payroll_run", publicId: "run-1" }] },
      }),
    ).not.toThrow();

    expect(screen.getByText("Payroll run")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
