import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PlatformAuditTrailItem, PlatformAuditTrailPage } from "../api/audit";
import { AdminAuditPage } from "./admin-audit-page";

const navigateMock = vi.hoisted(() => vi.fn());
const apiGetMock = vi.hoisted(() => vi.fn());
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

// `ky` (the apiClient's HTTP layer) constructs AbortSignals that jsdom's fetch rejects as
// cross-realm — stub the client boundary instead of the network.
vi.mock("@/shared/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api")>()),
  apiClient: { get: apiGetMock },
}));

const platformReadEvent: PlatformAuditTrailItem = {
  eventType: "audit.trail.platform_read",
  eventVersion: 1,
  occurredAt: "2026-08-13T10:00:00.000Z",
  scope: "PLATFORM",
  companyPublicId: null,
  outcome: "SUCCESS",
  actor: {
    kind: "PLATFORM_ADMIN",
    publicId: "550e8400-e29b-41d4-a716-446655440000",
    name: "Nadia Fahmy",
  },
  traceId: "5fc21e3361b0fe234353b1176c5b2fdf",
  origin: { ip: "203.0.113.10", userAgent: null },
  targets: [{ targetType: "audit-trail", publicId: "platform" }],
  details: { companyPublicId: null, scope: null },
  recordingBinding: "STANDALONE",
  recordedAt: "2026-08-13T10:00:04.000Z",
};

const companyOptionsPage = {
  data: [
    { publicId: "11111111-1111-4111-8111-111111111111", companyCode: "NW", name: "Northwind" },
  ],
};

function renderPage(
  page: Partial<Omit<PlatformAuditTrailPage, "items">> & { items?: unknown[] } = {},
) {
  apiGetMock.mockImplementation((path: string) => ({
    json: () =>
      Promise.resolve(
        path === "companies"
          ? companyOptionsPage
          : { items: [], nextCursor: null, hasMore: false, ...page },
      ),
  }));
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <AdminAuditPage />
    </QueryClientProvider>,
  );
}

/** Applies the search updater the page passed to `navigate` to the current search state. */
function readNavigatedSearch() {
  const updateSearch = navigateMock.mock.calls[0]?.[0]?.search;
  return updateSearch({ ...searchState });
}

function trailRequests() {
  return apiGetMock.mock.calls.filter(([path]) => path === "platform/audit-trail");
}

afterEach(() => {
  cleanup();
  apiGetMock.mockReset();
  navigateMock.mockReset();
  for (const key of Object.keys(searchState)) {
    if (key !== "limit") delete searchState[key];
  }
});

describe("AdminAuditPage filters", () => {
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
    apiGetMock.mockImplementation((path: string) => ({
      json: () =>
        Promise.resolve(
          path === "platform/audit-trail/actors"
            ? [{ publicId: "22222222-2222-4222-8222-222222222222", name: "Layla Hassan" }]
            : path === "companies"
              ? companyOptionsPage
              : { items: [platformReadEvent], nextCursor: null, hasMore: false },
        ),
    }));
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <AdminAuditPage />
      </QueryClientProvider>,
    );

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

  // "Everything else that happened in this request" is the move an investigator makes from a
  // row, so the trace has to become a filter rather than a string to copy out by hand.
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
    renderPage({ items: [platformReadEvent] });
    await screen.findByText("Audit trail viewed");

    // The mocked client is untyped by construction; the fetcher always passes this shape.
    const first = trailRequests()[0]?.[1] as { searchParams: URLSearchParams };
    expect(first.searchParams.get("cursor")).toBe("opaque-current");
    expect(first.searchParams.getAll("eventType")).toEqual(["audit.trail.platform_read"]);

    fireEvent.click(screen.getByRole("button", { name: /Outcome/ }));
    fireEvent.click(
      within(screen.getByRole("group", { name: "Outcome" })).getByRole("option", {
        name: "Failure",
      }),
    );
    const nextSearch = readNavigatedSearch();
    expect(nextSearch.cursor).toBeUndefined();

    cleanup();
    apiGetMock.mockClear();
    Object.assign(searchState, nextSearch);
    renderPage({ items: [platformReadEvent] });
    await waitFor(() => expect(trailRequests().length).toBeGreaterThan(0));

    for (const [, options] of trailRequests()) {
      expect((options as { searchParams: URLSearchParams }).searchParams.has("cursor")).toBe(false);
    }
  });
});
