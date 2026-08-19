import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CompanyAuditTrailItem, CompanyAuditTrailPage } from "../api/audit";
import { CompanyAuditPage } from "./company-audit-page";

const navigateMock = vi.hoisted(() => vi.fn());
const apiGetMock = vi.hoisted(() => vi.fn());
const searchState = vi.hoisted(() => ({ limit: 50 }) as Record<string, unknown>);

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useSearch: () => searchState,
  };
});

// `ky` (the apiClient's HTTP layer) constructs AbortSignals that jsdom's fetch
// rejects as cross-realm — stub the client boundary instead of the network.
vi.mock("@/shared/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api")>()),
  apiClient: { get: apiGetMock },
}));

const profileUpdatedEvent: CompanyAuditTrailItem = {
  eventType: "company.profile.material_updated",
  eventVersion: 1,
  occurredAt: "2026-08-13T10:00:00.000Z",
  outcome: "SUCCESS",
  actor: { kind: "USER", publicId: "550e8400-e29b-41d4-a716-446655440000" },
  traceId: "5fc21e3361b0fe234353b1176c5b2fdf",
  targets: [{ targetType: "company-profile", publicId: "profile-1" }],
  details: { changes: [{ field: "name", before: "Northwind", after: "Northwind Egypt" }] },
};

function renderPage(
  page: Partial<Omit<CompanyAuditTrailPage, "items">> & { items?: unknown[] } = {},
) {
  apiGetMock.mockReturnValue({
    json: () => Promise.resolve({ items: [], nextCursor: null, hasMore: false, ...page }),
  });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <CompanyAuditPage />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  apiGetMock.mockReset();
  navigateMock.mockReset();
  delete searchState.cursor;
});

describe("CompanyAuditPage", () => {
  it("reads the Company Audit Trail and lists its events", async () => {
    renderPage({ items: [profileUpdatedEvent] });

    expect(await screen.findByText("Profile details changed")).toBeInTheDocument();
    expect(apiGetMock.mock.calls[0]?.[0]).toBe("company/audit-trail");
  });

  it("expands a row in place without requesting its already-loaded payload", async () => {
    renderPage({ items: [profileUpdatedEvent] });
    const rowButton = await screen.findByRole("button", { name: /Profile details changed/ });
    expect(apiGetMock).toHaveBeenCalledTimes(1);

    fireEvent.click(rowButton);

    expect(screen.getByText("Northwind")).toBeInTheDocument();
    expect(screen.getByText("Northwind Egypt")).toBeInTheDocument();
    expect(screen.getByText(/company\.profile\.material_updated v1/)).toBeInTheDocument();
    expect(apiGetMock).toHaveBeenCalledTimes(1);
  });

  it("reserves outcome emphasis for failures", async () => {
    renderPage({ items: [{ ...profileUpdatedEvent, outcome: "FAILURE" }] });

    const failure = await screen.findByText("Failure");
    expect(failure).toBeInTheDocument();
    expect(failure.closest("td")).toHaveClass("border-s-2", "border-[var(--color-danger)]");
    expect(screen.queryByText("Success")).not.toBeInTheDocument();
  });

  it("keeps an unrecognized record in the sequence and identifies the portal gap", async () => {
    renderPage({
      items: [
        {
          ...profileUpdatedEvent,
          eventType: "company.profile.future_event",
        },
      ],
    });

    expect(await screen.findByText("Unrecognized event")).toBeInTheDocument();
    expect(screen.getByText("Portal gap")).toBeInTheDocument();
    expect(screen.getByText("1 event")).toBeInTheDocument();
    expect(screen.queryByText("Failure")).not.toBeInTheDocument();
  });

  it("preserves a valid timestamp when another field makes the record unrecognized", async () => {
    renderPage({
      items: [{ ...profileUpdatedEvent, actor: { kind: "USER" } }],
    });

    expect(await screen.findByText("Unrecognized event")).toBeInTheDocument();
    expect(screen.getByText(/13 Aug/)).toBeInTheDocument();
    expect(screen.queryByText("Unknown time")).not.toBeInTheDocument();
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
});

describe("CompanyAuditPage cursor navigation", () => {
  it("offers only the forward step on the first page", async () => {
    renderPage({ items: [profileUpdatedEvent], nextCursor: "opaque-next", hasMore: true });

    expect(await screen.findByRole("button", { name: "Older events" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Latest events" })).not.toBeInTheDocument();
  });

  it("offers both steps on a middle page and follows the opaque cursor forward", async () => {
    searchState.cursor = "opaque-current";
    renderPage({ items: [profileUpdatedEvent], nextCursor: "opaque-next", hasMore: true });

    fireEvent.click(await screen.findByRole("button", { name: "Older events" }));

    expect(screen.getByRole("button", { name: "Latest events" })).toBeInTheDocument();
    expect(readNavigatedSearch()).toEqual({ limit: 50, cursor: "opaque-next" });
  });

  it("drops the cursor entirely when returning to the latest events", async () => {
    searchState.cursor = "opaque-current";
    renderPage({ items: [profileUpdatedEvent], nextCursor: null, hasMore: false });

    fireEvent.click(await screen.findByRole("button", { name: "Latest events" }));

    expect(readNavigatedSearch()).toEqual({ limit: 50 });
  });

  it("stops offering the forward step on the final page", async () => {
    searchState.cursor = "opaque-current";
    renderPage({ items: [profileUpdatedEvent], nextCursor: null, hasMore: false });

    expect(await screen.findByRole("button", { name: "Latest events" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Older events" })).not.toBeInTheDocument();
  });

  it("offers no navigation on an empty first page", async () => {
    renderPage({ items: [] });

    expect(await screen.findByText("No audit events")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Older events" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Latest events" })).not.toBeInTheDocument();
  });
});

/** Applies the search updater the page passed to `navigate` to the current search state. */
function readNavigatedSearch() {
  const updateSearch = navigateMock.mock.calls[0]?.[0]?.search;
  return updateSearch({ ...searchState });
}
