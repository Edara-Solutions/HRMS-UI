import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { LeadListResponse, LeadWithContacts } from "../api/leads";
import { AdminLeadsPage } from "./admin-leads-page";

const navigateMock = vi.hoisted(() => vi.fn());
const leadsGetMock = vi.hoisted(() => vi.fn());
const searchState = vi.hoisted(
  () =>
    ({
      page: 1,
      pageSize: 10,
      q: undefined,
      status: undefined,
      source: undefined,
      country: undefined,
      isArchived: false,
      sort: undefined,
    }) as Record<string, unknown>,
);

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useSearch: () => searchState,
  };
});

// `ky` (the apiClient's HTTP layer) constructs AbortSignals that jsdom's fetch
// rejects as cross-realm —? stub the client boundary instead of the network.

vi.mock("@/shared/ui/country-select", () => ({
  CountrySelect: ({ id, value }: { id?: string; value: string }) => (
    <button id={id} type="button">
      {value || "Select country"}
    </button>
  ),
}));
vi.mock("@/shared/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api")>()),
  apiClient: {
    get: leadsGetMock,
  },
}));

function jsonResponse<T>(value: T) {
  return { json: () => Promise.resolve(value) };
}

function makeLead(): LeadWithContacts {
  return {
    lead: {
      publicId: "lead-1",
      companyName: "Acme Corp",
      website: null,
      industry: "Retail",
      companySizeRange: "21_TO_50",
      country: "Egypt",
      city: "Cairo",
      source: "CRM",
      status: "QUALIFIED",
      lostReason: null,
      isConverted: false,
      numberOfAttempts: 2,
      lastAttemptAt: "2026-06-02T00:00:00.000Z",
      isArchived: false,
      createdAt: "2026-06-01T00:00:00.000Z",
      updatedAt: "2026-06-02T00:00:00.000Z",
      deletedAt: null,
    },
    contacts: [],
  };
}

function makeResponse(overrides: Partial<LeadListResponse> = {}): LeadListResponse {
  return {
    items: [makeLead()],
    meta: { mode: "page", page: 1, pageSize: 10, totalItems: 1, totalPages: 1 },
    ...overrides,
  };
}

function lastNavigateSearch(): (previous: Record<string, unknown>) => Record<string, unknown> {
  const lastCall = navigateMock.mock.calls.at(-1);
  if (!lastCall) throw new Error("navigate was not called");
  return lastCall[0].search;
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AdminLeadsPage />
    </QueryClientProvider>,
  );
}

describe("AdminLeadsPage", () => {
  afterEach(() => {
    cleanup();
    navigateMock.mockReset();
    leadsGetMock.mockReset();
    Object.assign(searchState, {
      page: 1,
      pageSize: 10,
      q: undefined,
      status: undefined,
      source: undefined,
      country: undefined,
      isArchived: false,
      sort: undefined,
    });
  });

  it("renders leads from the real hook with human-readable labels", async () => {
    leadsGetMock.mockReturnValue(jsonResponse(makeResponse()));
    renderPage();

    expect(await screen.findByRole("heading", { name: "Acme Corp" })).toBeInTheDocument();
    expect(screen.getAllByText("Qualified").length).toBeGreaterThan(0);
    expect(screen.getAllByText("CRM").length).toBeGreaterThan(0);
  });

  it("defaults the archive filter to active leads only", async () => {
    leadsGetMock.mockReturnValue(jsonResponse(makeResponse()));
    renderPage();

    await screen.findByRole("heading", { name: "Acme Corp" });
    expect(screen.getByLabelText(/filter by archive state/i)).toHaveTextContent("Active");
    expect(screen.queryByText("All leads")).not.toBeInTheDocument();

    const { searchParams } = leadsGetMock.mock.calls[0][1] as { searchParams: URLSearchParams };
    expect(searchParams.get("isArchived")).toBe("false");
  });
  it("renders a safe fallback for an unknown server-owned status", async () => {
    const item = makeLead();
    Object.defineProperty(item.lead, "status", { value: "FUTURE_STATUS" });
    leadsGetMock.mockReturnValue(jsonResponse(makeResponse({ items: [item] })));
    renderPage();

    expect((await screen.findAllByText("future status")).length).toBeGreaterThan(0);
  });
  it("drives status, source, and country filters through useLeads query params", async () => {
    Object.assign(searchState, { status: "QUALIFIED", source: "GOOGLE", country: "Egypt" });
    leadsGetMock.mockReturnValue(jsonResponse(makeResponse()));
    renderPage();

    await waitFor(() =>
      expect(leadsGetMock).toHaveBeenCalledWith(
        "leads",
        expect.objectContaining({
          searchParams: expect.any(URLSearchParams),
        }),
      ),
    );

    const { searchParams } = leadsGetMock.mock.calls[0][1] as { searchParams: URLSearchParams };
    expect(searchParams.get("status")).toBe("QUALIFIED");
    expect(searchParams.get("source")).toBe("GOOGLE");
    expect(searchParams.get("country")).toBe("Egypt");
  });

  it("forwards archive and creation-date filters to the controlled API boundary", async () => {
    Object.assign(searchState, {
      createdFrom: { date: "2026-06-01", edgeDateType: "exclusive" },
      createdTo: { date: "2026-06-30", edgeDateType: "inclusive" },
      isArchived: true,
    });
    leadsGetMock.mockReturnValue(jsonResponse(makeResponse()));
    renderPage();

    await waitFor(() => expect(leadsGetMock).toHaveBeenCalled());
    const { searchParams } = leadsGetMock.mock.calls[0][1] as { searchParams: URLSearchParams };
    expect(searchParams.get("createdFrom")).toBe(
      JSON.stringify({ date: "2026-06-01", edgeDateType: "exclusive" }),
    );
    expect(searchParams.get("createdTo")).toBe(
      JSON.stringify({ date: "2026-06-30", edgeDateType: "inclusive" }),
    );
    expect(searchParams.get("isArchived")).toBe("true");
  });
  it("navigates with a search-string update and resets to page 1 when the free-text search changes", async () => {
    leadsGetMock.mockReturnValue(jsonResponse(makeResponse()));
    renderPage();
    await screen.findByRole("heading", { name: "Acme Corp" });

    fireEvent.change(screen.getByPlaceholderText(/search by company/i), {
      target: { value: "Acme" },
    });

    await waitFor(() => expect(navigateMock).toHaveBeenCalled());
    const search = lastNavigateSearch();
    expect(search({ page: 3, pageSize: 10 })).toEqual(
      expect.objectContaining({ q: "Acme", page: 1 }),
    );
  });

  it("debounces the search box instead of navigating per keystroke, and keeps a trailing space while typing", async () => {
    vi.useFakeTimers();
    try {
      leadsGetMock.mockReturnValue(jsonResponse(makeResponse()));
      renderPage();

      const searchInput = screen.getByPlaceholderText(/search by company/i);

      fireEvent.change(searchInput, { target: { value: "Acme" } });
      fireEvent.change(searchInput, { target: { value: "Acme " } });

      // Typing must not navigate immediately, and the trailing space must not be stripped mid-typing.
      expect(navigateMock).not.toHaveBeenCalled();
      expect(searchInput).toHaveValue("Acme ");

      act(() => {
        vi.advanceTimersByTime(400);
      });

      expect(navigateMock).toHaveBeenCalledTimes(1);
      const search = lastNavigateSearch();
      expect(search({ page: 3, pageSize: 10 })).toEqual(
        expect.objectContaining({ q: "Acme ", page: 1 }),
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("navigates with the selected status and resets to page 1", async () => {
    leadsGetMock.mockReturnValue(jsonResponse(makeResponse()));
    renderPage();
    await screen.findByRole("heading", { name: "Acme Corp" });

    fireEvent.click(screen.getByLabelText(/filter by status/i));
    fireEvent.click(screen.getByRole("option", { name: "Negotiation" }));

    await waitFor(() => expect(navigateMock).toHaveBeenCalled());
    const search = lastNavigateSearch();
    expect(search({ page: 4, pageSize: 10 })).toEqual(
      expect.objectContaining({ status: "NEGOTIATION", page: 1 }),
    );
  });

  it("reflects backend totals and pages forward via useLeads, not client-side slicing", async () => {
    leadsGetMock.mockReturnValue(
      jsonResponse(
        makeResponse({
          meta: { mode: "page", page: 2, pageSize: 10, totalItems: 42, totalPages: 5 },
        }),
      ),
    );
    renderPage();

    expect(await screen.findByText("2 / 5")).toBeInTheDocument();
    expect(screen.getByText(/1 of 42 leads/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /next page/i }));

    await waitFor(() => expect(navigateMock).toHaveBeenCalled());
    const search = lastNavigateSearch();
    expect(search({ page: 2, pageSize: 10 })).toEqual(expect.objectContaining({ page: 3 }));
  });

  it("does not render Convert actions in the leads list", async () => {
    leadsGetMock.mockReturnValue(jsonResponse(makeResponse()));
    renderPage();
    await screen.findByRole("heading", { name: "Acme Corp" });

    expect(screen.queryByRole("button", { name: /^convert$/i })).not.toBeInTheDocument();
  });
});
