import { cleanup, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AdminAuditEventInsight } from "./admin-audit-event-insight";

const occurredAt = "2026-08-13T10:00:00.000Z";

function renderInsight(props: Partial<Parameters<typeof AdminAuditEventInsight>[0]> = {}) {
  return render(
    <AdminAuditEventInsight
      eventType="audit.trail.platform_read"
      occurredAt={occurredAt}
      recordingBinding="TRANSACTIONAL"
      recordedAt={occurredAt}
      locale="en"
      {...props}
    />,
  );
}

describe("AdminAuditEventInsight", () => {
  it("says in plain language whether the row is evidence or a report", () => {
    renderInsight();
    expect(screen.getByText("Recorded in the same transaction as the change")).toBeInTheDocument();

    cleanup();
    renderInsight({ recordingBinding: "STANDALONE" });
    expect(screen.getByText("Recorded separately, after the change")).toBeInTheDocument();
  });

  // Two timestamps a reader has to subtract are not a lag; the sentence is.
  it("names the recording lag once it is worth naming, and stays quiet below a second", () => {
    renderInsight({ recordedAt: "2026-08-13T10:00:04.000Z" });
    expect(screen.getByText("Recorded 4 seconds later")).toBeInTheDocument();

    cleanup();
    renderInsight({ recordedAt: "2026-08-13T10:00:00.400Z" });
    expect(screen.queryByText(/later/)).not.toBeInTheDocument();
  });

  it("renders the catalog's own sentence about the event, and why it can never fail", () => {
    renderInsight();

    expect(
      screen.getByText("An authorized Platform Admin read the Platform Audit Trail."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "This event is only ever recorded on success, so it never appears as a failure.",
      ),
    ).toBeInTheDocument();
  });

  it("renders nothing about an event type this build has never heard of", () => {
    renderInsight({ eventType: "not.an.event" });

    expect(screen.queryByText("About this event")).not.toBeInTheDocument();
    expect(screen.getByText("Provenance")).toBeInTheDocument();
  });
});
