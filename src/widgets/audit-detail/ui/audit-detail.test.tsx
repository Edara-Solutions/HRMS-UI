import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AuditDetail } from "./audit-detail";

const baseProps = {
  portal: "admin" as const,
  targets: [{ targetType: "employee", publicId: "employee-1" }],
  occurredAt: "2026-08-18T09:12:34.000Z",
  locale: "en" as const,
  eventKey: "user.lifecycle.updated",
  eventVersion: 1,
};

describe("AuditDetail", () => {
  it("dispatches field diffs by payload shape", () => {
    const { container } = render(
      <AuditDetail
        {...baseProps}
        details={{ changes: [{ field: "name", before: "Old", after: "New" }] }}
      />,
    );

    expect(container.querySelector('[data-audit-renderer="field-diff"]')).toBeInTheDocument();
    expect(screen.getByText("Old")).toBeInTheDocument();
    expect(screen.getByText("New")).toBeInTheDocument();
  });

  it("dispatches changed-field lists by payload shape", () => {
    const { container } = render(
      <AuditDetail
        {...baseProps}
        details={{ changedFields: ["employeeCode", "status"], status: "IN_PROGRESS" }}
      />,
    );

    expect(
      container.querySelector('[data-audit-renderer="changed-field-list"]'),
    ).toBeInTheDocument();
    expect(screen.getByText("Employee code")).toBeInTheDocument();
    expect(screen.getByText("In progress")).toBeInTheDocument();
  });

  it("collapses transition pairs into a single before-to-after line", () => {
    render(
      <AuditDetail
        {...baseProps}
        details={{ previousStatus: "PENDING", status: "COMPLETED", reason: "Accepted" }}
      />,
    );

    expect(screen.getAllByText("Status")).toHaveLength(1);
    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();
  });

  it("resolves entity references against targets", () => {
    render(<AuditDetail {...baseProps} details={{ employeePublicId: "employee-1" }} />);

    expect(
      screen
        .getAllByText(/Employee/)
        .some((element) => element.textContent?.includes("employee-1")),
    ).toBe(true);
  });

  it("formats conventional and exceptional instant fields without exposing ISO reading text", () => {
    const { container } = render(
      <AuditDetail
        {...baseProps}
        details={{
          activatedAt: "2026-08-18T09:12:34.000Z",
          effectiveFrom: "2026-08-18T09:12:34.000Z",
        }}
      />,
    );

    const readingValues = [...container.querySelectorAll("dd")].map(
      (element) => element.textContent,
    );
    expect(readingValues).toHaveLength(2);
    expect(readingValues.every((value) => !value?.includes("2026-08-18T09:12:34.000Z"))).toBe(true);
  });

  it("states boolean predicates as facts", () => {
    render(<AuditDetail {...baseProps} details={{ isPrimary: true, hasEmail: false }} />);

    expect(screen.getByText("Yes")).toBeInTheDocument();
    expect(screen.getByText("No")).toBeInTheDocument();
  });

  it("renders available request origin metadata", () => {
    render(
      <AuditDetail
        {...baseProps}
        details={{}}
        origin={{ ip: "203.0.113.10", userAgent: "Audit client" }}
      />,
    );

    expect(screen.getByText("203.0.113.10")).toBeInTheDocument();
    expect(screen.getByText("Audit client")).toBeInTheDocument();
  });
});
