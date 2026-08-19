import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AuditDetail } from "@/widgets/audit-detail";
import { PlatformAuditTrailEvent } from "../api/audit-runtime-contract";

afterEach(cleanup);

function detailsFromSchema(shape: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.keys(shape).map((field) => {
      if (field === "changes")
        return [field, [{ field: "name", before: "Before", after: "After" }]];
      if (field === "changedFields") return [field, ["name"]];
      if (/^(?:is|has|was|used|reissued|rejoined|unarchived)/.test(field)) return [field, true];
      return [field, "Value"];
    }),
  );
}

describe("audit detail catalog coverage", () => {
  it("dispatches every generated catalog payload to a renderer", () => {
    const catalogOptions = PlatformAuditTrailEvent.options.filter(
      (option) => option.shape.eventType.value !== "audit.event.unavailable",
    );
    const rendererCounts: Record<string, number> = {};

    expect(catalogOptions).toHaveLength(60);

    for (const option of catalogOptions) {
      const eventKey = option.shape.eventType.value;
      const details =
        "details" in option.shape ? detailsFromSchema(option.shape.details.shape) : {};
      const { container, unmount } = render(
        <AuditDetail
          details={details}
          targets={[]}
          occurredAt="2026-08-18T09:12:34.000Z"
          locale="en"
          eventKey={eventKey}
          eventVersion={1}
        />,
      );

      const rendered = container.querySelector("[data-audit-renderer]");
      expect(rendered, eventKey).toBeInTheDocument();
      const renderer = rendered?.getAttribute("data-audit-renderer") ?? "missing";
      rendererCounts[renderer] = (rendererCounts[renderer] ?? 0) + 1;
      unmount();
    }

    expect(rendererCounts).toEqual({
      "scalar-bag": 55,
      "field-diff": 2,
      "changed-field-list": 3,
    });
  });
});
