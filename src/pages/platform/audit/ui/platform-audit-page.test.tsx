import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { platformCommunicationsOperations as operations } from "@/shared/api";
import { RouteAccessRefusal, usePlatformSession } from "@/shared/auth";
import { platformSessionFixture } from "../../../../test/audience-fixtures";
import { navigationSearch } from "../../../../test/navigation-fixtures";
import { operationNetwork } from "../../../../test/operation-request-mock";
import type { PlatformAuditTrailItem, PlatformAuditTrailPage } from "../api/audit";
import { PlatformAuditPage } from "./platform-audit-page";

const navigateMock = vi.hoisted(() => vi.fn());
const searchState = vi.hoisted(() => ({ limit: 50 }) as Record<string, unknown>);

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  const { createElement } = await import("react");
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useSearch: () => searchState,
    // The page renders outside a router here, and `Link` needs one; the anchor is enough to
    // assert the catalog is reachable without standing a whole route tree up.
    Link: ({ to, children, ...props }: { to: string; children: ReactNode }) =>
      createElement("a", { href: to, ...props }, children),
  };
});

vi.mock("@/shared/api/operation-request", async (original) => {
  const actual =
    await original<
      Pick<typeof import("@/shared/api"), "executeOperationRequest" | "OperationRefusal">
    >();
  return {
    ...actual,
    executeOperationRequest: (client: never, operation: never, input: unknown) =>
      operationNetwork.current.execute(client, operation, input, actual.OperationRefusal),
  };
});

const platformReadEvent: PlatformAuditTrailItem = {
  eventType: "audit.trail.platform_read",
  eventVersion: 1,
  occurredAt: "2026-08-13T10:00:00.000Z",
  scope: "PLATFORM",
  companyPublicId: null,
  outcome: "SUCCESS",
  actor: {
    kind: "PLATFORM_USER",
    publicId: "550e8400-e29b-41d4-a716-446655440000",
    name: "Nadia Fahmy",
  },
  traceId: "5fc21e3361b0fe234353b1176c5b2fdf",
  origin: { ip: "203.0.113.10", userAgent: null, country: null, city: null },
  targets: [{ targetType: "audit-trail", publicId: "platform", name: null }],
  details: { companyPublicId: null, scope: null },
  recordingBinding: "STANDALONE",
  recordedAt: "2026-08-13T10:00:04.000Z",
};

const companyOptionsPage = {
  data: [
    {
      publicId: "11111111-1111-4111-8111-111111111111",
      companyCode: "NW",
      name: "Northwind",
      logo: null,
      website: null,
      phoneNumber: "+20 100 000 0000",
      country: "EG",
      addressLine: null,
      isActive: true,
      lifecycleStatus: "ACTIVE",
      activatedAt: "2026-08-01T00:00:00.000Z",
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-01T00:00:00.000Z",
    },
  ],
  meta: { page: 1, limit: 100, total: 1, totalPages: 1 },
};

function renderPage(
  page: Partial<Omit<PlatformAuditTrailPage, "items">> & { items?: unknown[] } = {},
  permissions: string[] = ["audit-events:read", "companies:read"],
) {
  const net = operationNetwork.install();
  usePlatformSession.getState().setSession(platformSessionFixture({ permissions }));
  net.on("GET /api/v1/platform/me", () => ({
    status: 200,
    body: platformSessionFixture({ permissions }).user,
  }));
  net.on(operations.auditTrail.key, () => ({
    status: 200,
    body: {
      items: page.items ?? [],
      nextCursor: page.nextCursor ?? null,
      hasMore: page.hasMore ?? false,
    },
  }));
  net.on("GET /api/v1/platform/companies", () => ({ status: 200, body: companyOptionsPage }));
  net.on(operations.auditActors.key, () => ({
    status: 200,
    body: [
      { publicId: "22222222-2222-4222-8222-222222222222", name: "Layla Hassan", kind: "USER" },
    ],
  }));

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <PlatformAuditPage />
    </QueryClientProvider>,
  );
  return net;
}

/** Applies the search updater the page passed to `navigate` to the current search state. */
function readNavigatedSearch() {
  const updateSearch = (_previous: Record<string, unknown>) =>
    navigationSearch(navigateMock.mock.calls[0]?.[0]?.href);
  return updateSearch({ ...searchState });
}

afterEach(() => {
  cleanup();
  navigateMock.mockReset();
  usePlatformSession.getState().clearSession();
  for (const key of Object.keys(searchState)) {
    if (key !== "limit") delete searchState[key];
  }
});

describe("PlatformAuditPage filters", () => {
  it("offers the Company starting point as a name picker rather than an identifier box", async () => {
    renderPage({ items: [platformReadEvent] });
    fireEvent.click(await screen.findByRole("button", { name: /Company/ }));

    const panel = screen.getByRole("group", { name: "Company" });
    fireEvent.click(await within(panel).findByRole("option", { name: /Northwind/ }));

    expect(readNavigatedSearch()).toEqual({
      limit: 50,
      cursor: undefined,
      companyPublicId: "11111111-1111-4111-8111-111111111111",
    });
  });

  it("keeps the scope control the Company trail has no use for", async () => {
    renderPage({ items: [platformReadEvent] });
    fireEvent.click(await screen.findByRole("button", { name: /Scope/ }));
    fireEvent.click(
      within(screen.getByRole("group", { name: "Scope" })).getByRole("option", {
        name: "Company",
      }),
    );

    expect(readNavigatedSearch()).toEqual({ limit: 50, cursor: undefined, scope: "COMPANY" });
  });

  it("resolves an actor name to the identifier the trail filters by", async () => {
    renderPage({ items: [platformReadEvent] });

    fireEvent.click(await screen.findByRole("button", { name: /Actor/ }));
    const panel = screen.getByRole("group", { name: "Actor" });
    fireEvent.change(within(panel).getByRole("combobox"), { target: { value: "lay" } });

    fireEvent.click(await within(panel).findByRole("option", { name: "Layla Hassan" }));
    expect(readNavigatedSearch()).toEqual({
      limit: 50,
      cursor: undefined,
      actorPublicId: "22222222-2222-4222-8222-222222222222",
    });
  });

  it("turns the trace on an expanded row into the filter that gathers its request", async () => {
    renderPage({ items: [platformReadEvent] });
    fireEvent.click(await screen.findByRole("button", { name: /Audit trail viewed/ }));

    fireEvent.click(screen.getByRole("button", { name: "Filter by this trace" }));

    expect(readNavigatedSearch()).toEqual({
      limit: 50,
      cursor: undefined,
      traceId: "5fc21e3361b0fe234353b1176c5b2fdf",
    });
  });

  it("shows the recording provenance and the catalog's own words on the expanded row", async () => {
    renderPage({ items: [platformReadEvent] });
    fireEvent.click(await screen.findByRole("button", { name: /Audit trail viewed/ }));

    expect(screen.getByText("Recorded separately, after the change")).toBeInTheDocument();
    expect(screen.getByText("Recorded 4 seconds later")).toBeInTheDocument();
    expect(
      screen.getByText("An authorized Platform Admin read the Platform Audit Trail."),
    ).toBeInTheDocument();
  });

  it("carries the URL's filters into the request and never a cursor minted before them", async () => {
    searchState.cursor = "opaque-current";
    searchState.scope = "PLATFORM";
    searchState.eventType = ["audit.trail.platform_read"];
    const net = renderPage({ items: [platformReadEvent] });
    await screen.findByText("Audit trail viewed");

    const calls = net.calls.filter((call) => call.key === operations.auditTrail.key);
    expect(calls[0]?.input).toEqual({
      query: {
        cursor: "opaque-current",
        limit: 50,
        scope: "PLATFORM",
        eventType: ["audit.trail.platform_read"],
      },
    });

    fireEvent.click(screen.getByRole("button", { name: /Outcome/ }));
    fireEvent.click(
      within(screen.getByRole("group", { name: "Outcome" })).getByRole("option", {
        name: "Failure",
      }),
    );
    const nextSearch = readNavigatedSearch();
    expect(nextSearch.cursor).toBeUndefined();

    cleanup();
    delete searchState.cursor;
    Object.assign(searchState, nextSearch);
    renderPage({ items: [platformReadEvent] });
    await waitFor(() =>
      expect(
        operationNetwork.current.calls.filter((call) => call.key === operations.auditTrail.key)
          .length,
      ).toBeGreaterThan(0),
    );

    const newCalls = operationNetwork.current.calls.filter(
      (call) => call.key === operations.auditTrail.key,
    );
    for (const call of newCalls) {
      expect(call.input).not.toMatchObject({ query: { cursor: expect.any(String) } });
    }
  });

  it("refuses access when audit-events:read is missing", () => {
    expect(() => renderPage({ items: [platformReadEvent] }, [])).toThrow(RouteAccessRefusal);
    cleanup();
  });

  it("shows contract unavailable state on ContractViolation", async () => {
    const net = operationNetwork.install();
    usePlatformSession
      .getState()
      .setSession(platformSessionFixture({ permissions: ["audit-events:read"] }));
    net.on("GET /api/v1/platform/me", () => ({
      status: 200,
      body: platformSessionFixture().user,
    }));
    net.on(operations.auditTrail.key, () => ({
      status: 200,
      body: { secret: "response-canary" },
    }));
    net.on("GET /api/v1/platform/companies", () => ({ status: 200, body: companyOptionsPage }));

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <PlatformAuditPage />
      </QueryClientProvider>,
    );

    expect(
      await screen.findByText("This history is temporarily unavailable. Try again later."),
    ).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("response-canary");
  });
});
