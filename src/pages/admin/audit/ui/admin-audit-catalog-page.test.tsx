import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { auditEventCatalog } from "@/shared/audit-catalog";
import { AdminAuditCatalogPage } from "./admin-audit-catalog-page";

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  const { createElement } = await import("react");
  return {
    ...actual,
    // The page renders outside a router here; an anchor is enough to assert the way back.
    Link: ({ to, children, ...props }: { to: string; children: ReactNode }) =>
      createElement("a", { href: to, ...props }, children),
  };
});

afterEach(cleanup);

describe("AdminAuditCatalogPage", () => {
  it("lists every catalog event with the semantics an investigator came for", () => {
    render(<AdminAuditCatalogPage />);

    expect(screen.getByText(`${auditEventCatalog.length} events`)).toBeInTheDocument();
    expect(
      screen.getByText("An authorized Platform Admin read the Platform Audit Trail."),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Personal data").length).toBe(auditEventCatalog.length);
  });

  it("explains what an event type means to someone choosing it as a filter", () => {
    render(<AdminAuditCatalogPage />);

    const denied = screen.getByText("company.access-policy.denied").closest("li");
    expect(denied).not.toBeNull();
    if (!denied) return;
    expect(
      within(denied).getByText(
        "A Company's access policy denied an operation for one of its users.",
      ),
    ).toBeInTheDocument();
    expect(within(denied).getByText("Success or failure")).toBeInTheDocument();
  });

  it("says so plainly when a search matches nothing", async () => {
    render(<AdminAuditCatalogPage />);

    fireEvent.change(screen.getByLabelText("Search events"), {
      target: { value: "no-such-event" },
    });

    // The search debounces into the filter, so the empty state arrives a tick later.
    expect(await screen.findByText("No events match this search")).toBeInTheDocument();
  });
});
