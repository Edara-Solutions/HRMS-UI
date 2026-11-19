import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCompanySession } from "@/shared/auth";
import { companySessionFixture } from "../../../../test/audience-fixtures";
import { navigationSearch } from "../../../../test/navigation-fixtures";
import { operationNetwork } from "../../../../test/operation-request-mock";
import { CompanyAuditPage } from "./company-audit-page";

const navigateMock = vi.hoisted(() => vi.fn());
const searchState = vi.hoisted(() => ({ limit: 50 }) as Record<string, unknown>);

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useSearch: () => searchState,
  };
});

const trailKey = "GET /api/v1/company/audit-trail";
const actorId = "550e8400-e29b-41d4-a716-446655440000";

function event(actor: unknown, overrides: Record<string, unknown> = {}) {
  return {
    eventType: "company.profile.material_updated",
    eventVersion: 1,
    occurredAt: "2026-08-13T10:00:00.000Z",
    outcome: "SUCCESS",
    ...(actor === undefined ? {} : { actor }),
    traceId: "5fc21e3361b0fe234353b1176c5b2fdf",
    targets: [{ targetType: "company-profile", publicId: "profile-1" }],
    details: { changes: [{ field: "name", before: "Northwind", after: "Northwind Egypt" }] },
    ...overrides,
  };
}

const profileUpdatedEvent = event({ kind: "USER", publicId: actorId, name: "Layla Hassan" });

function renderPage(page: Record<string, unknown> = {}) {
  const net = operationNetwork.install();
  net.on(trailKey, () => ({
    status: 200,
    body: { items: [], nextCursor: null, hasMore: false, ...page },
  }));
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <CompanyAuditPage />
    </QueryClientProvider>,
  );
  return net;
}

function queryOf(net: ReturnType<typeof renderPage>, call = 0) {
  const input = net.calls.filter((entry) => entry.key === trailKey)[call]?.input;
  return typeof input === "object" && input !== null && "query" in input
    ? (input.query as Record<string, unknown>)
    : {};
}

/** Applies the search updater the page passed to `navigate` to the current search state. */
function readNavigatedSearch() {
  return navigationSearch(navigateMock.mock.calls[0]?.[0]?.href);
}

beforeEach(() => useCompanySession.getState().setSession(companySessionFixture()));

afterEach(() => {
  cleanup();
  navigateMock.mockReset();
  useCompanySession.getState().clearSession();
  for (const key of Object.keys(searchState)) {
    if (key !== "limit") delete searchState[key];
  }
});

describe("CompanyAuditPage", () => {
  it("reads the Company trail through its generated operation and lists its events", async () => {
    const net = renderPage({ items: [profileUpdatedEvent] });

    expect(await screen.findByText("Profile details changed")).toBeInTheDocument();
    expect(net.calls[0]).toEqual({
      audience: "company",
      key: trailKey,
      input: { query: { limit: 50 } },
    });
  });

  it("expands a row in place without requesting its already-loaded payload", async () => {
    const net = renderPage({ items: [profileUpdatedEvent] });
    const rowButton = await screen.findByRole("button", { name: /Profile details changed/ });

    fireEvent.click(rowButton);

    expect(screen.getByText("Northwind")).toBeInTheDocument();
    expect(screen.getByText("Northwind Egypt")).toBeInTheDocument();
    expect(net.count(trailKey)).toBe(1);
  });

  it("reserves outcome emphasis for failures", async () => {
    renderPage({ items: [{ ...profileUpdatedEvent, outcome: "FAILURE" }] });

    const failure = await screen.findByText("Failure");
    expect(failure.closest("td")).toHaveClass("border-s-2", "border-[var(--color-danger)]");
    expect(screen.queryByText("Success")).not.toBeInTheDocument();
  });

  it.each([
    ["named", { kind: "USER", publicId: actorId, name: "Layla Hassan" }, "Layla Hassan"],
    ["unresolved", { kind: "USER", publicId: actorId, name: null }, "550e8400"],
    ["system", { kind: "SYSTEM", component: "SCHEDULER" }, "Scheduler"],
    ["anonymous", { kind: "ANONYMOUS" }, "Anonymous"],
    ["attribution-failed", { kind: "ATTRIBUTION_FAILED" }, "Attribution failed"],
    ["erased", { kind: "ERASED_USER" }, "Erased identity"],
    ["withheld", undefined, "Identity withheld"],
  ])("renders the %s actor state without inventing identity", async (_state, actor, label) => {
    renderPage({ items: [event(actor)] });

    expect(await screen.findByText(new RegExp(label))).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/Platform admin|Edara acted/);
  });

  it("renders history it cannot project as unavailable rather than inventing facts", async () => {
    renderPage({
      items: [
        {
          eventType: "audit.event.unavailable",
          eventVersion: 1,
          occurredAt: "2026-08-13T10:01:00.000Z",
          reason: "UNSUPPORTED_OR_DAMAGED",
        },
      ],
    });

    expect(await screen.findByText("Unavailable event")).toBeInTheDocument();
    expect(screen.queryByText("audit.event.unavailable")).not.toBeInTheDocument();
  });

  it("refuses an undeclared event or actor as a contract violation, never a guessed row", async () => {
    renderPage({ items: [event({ kind: "PLATFORM_ADMIN" })] });

    expect(
      await screen.findByText("This history is temporarily unavailable. Try again later."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
  });

  it("keeps the subject identifier visible in compact density", async () => {
    renderPage({ items: [profileUpdatedEvent] });
    fireEvent.click(await screen.findByRole("button", { name: "Compact" }));

    expect(screen.getByText("profile-1")).toBeInTheDocument();
  });

  it("tells the reader when the Company has no recorded events", async () => {
    renderPage({ items: [] });

    expect(await screen.findByText("No audit events")).toBeInTheDocument();
  });
});

describe("CompanyAuditPage cursor navigation", () => {
  it("offers only the forward step on the first page", async () => {
    renderPage({ items: [profileUpdatedEvent], nextCursor: "opaque-next", hasMore: true });

    expect(await screen.findByRole("button", { name: "Older events" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Latest events" })).not.toBeInTheDocument();
  });

  it("follows the opaque cursor forward from a middle page", async () => {
    searchState.cursor = "opaque-current";
    const net = renderPage({
      items: [profileUpdatedEvent],
      nextCursor: "opaque-next",
      hasMore: true,
    });

    fireEvent.click(await screen.findByRole("button", { name: "Older events" }));

    expect(queryOf(net).cursor).toBe("opaque-current");
    expect(screen.getByRole("button", { name: "Latest events" })).toBeInTheDocument();
    expect(readNavigatedSearch()).toEqual({ limit: 50, cursor: "opaque-next" });
  });

  it("drops the cursor entirely when returning to the latest events", async () => {
    searchState.cursor = "opaque-current";
    renderPage({ items: [profileUpdatedEvent], nextCursor: null, hasMore: false });

    fireEvent.click(await screen.findByRole("button", { name: "Latest events" }));

    expect(readNavigatedSearch()).toEqual({ limit: 50 });
  });
});

describe("CompanyAuditPage filters", () => {
  it("exposes the Company filter set and neither a Company nor a scope control", async () => {
    renderPage({ items: [profileUpdatedEvent] });
    await screen.findByText("Profile details changed");
    const filters = within(screen.getByRole("search", { name: "Filters" }));

    expect(filters.getByRole("button", { name: /Actor/ })).toBeInTheDocument();
    expect(filters.getByRole("button", { name: /Event type/ })).toBeInTheDocument();
    expect(filters.queryByRole("button", { name: /Company/ })).not.toBeInTheDocument();
    expect(filters.queryByRole("button", { name: /Scope/ })).not.toBeInTheDocument();
  });

  it("drops the cursor when a filter changes", async () => {
    searchState.cursor = "opaque-current";
    renderPage({ items: [profileUpdatedEvent] });
    fireEvent.click(await screen.findByRole("button", { name: /Outcome/ }));
    fireEvent.click(
      within(screen.getByRole("group", { name: "Outcome" })).getByRole("option", {
        name: "Failure",
      }),
    );

    expect(readNavigatedSearch()).toEqual({ limit: 50, outcome: "FAILURE" });
  });

  it("filters to the actor a reader clicks in a row", async () => {
    renderPage({ items: [profileUpdatedEvent] });
    fireEvent.click(await screen.findByRole("button", { name: /Filter by this actor/ }));

    expect(readNavigatedSearch()).toMatchObject({ limit: 50, actorPublicId: actorId });
  });

  it("sends the declared filters the URL carries as a repeated event-type key", async () => {
    searchState.outcome = "FAILURE";
    searchState.eventType = ["company.profile.material_updated", "company.lifecycle.frozen"];
    const net = renderPage({ items: [profileUpdatedEvent] });

    await waitFor(() => expect(net.count(trailKey)).toBe(1));
    expect(queryOf(net)).toEqual({
      limit: 50,
      outcome: "FAILURE",
      eventType: ["company.profile.material_updated", "company.lifecycle.frozen"],
    });
  });

  it("never sends a Platform-only event type", async () => {
    searchState.eventType = ["platform.lead.created"];
    const net = renderPage({ items: [profileUpdatedEvent] });

    await waitFor(() => expect(net.count(trailKey)).toBe(1));
    expect(queryOf(net).eventType).toBeUndefined();
  });
});
