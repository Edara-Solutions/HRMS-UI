import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Company, CompanyListResponse } from "../api/companies";
import { AdminCompaniesPage } from "./admin-companies-page";

const navigateMock = vi.hoisted(() => vi.fn());
const apiGetMock = vi.hoisted(() => vi.fn());
const searchState = vi.hoisted(
  () => ({ page: 1, pageSize: 10, q: undefined }) as Record<string, unknown>,
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
// rejects as cross-realm - stub the client boundary instead of the network.
vi.mock("@/shared/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api")>()),
  apiClient: {
    get: apiGetMock,
  },
}));

function jsonResponse<T>(value: T) {
  return { json: () => Promise.resolve(value) };
}

function makeCompany(overrides: Partial<Company> = {}): Company {
  return {
    publicId: "company-1",
    logo: null,
    name: "Nexus Technologies",
    website: "https://nexustech.sa",
    phoneNumber: "+966112345678",
    country: "Saudi Arabia",
    companyCode: "NEXUS",
    isActive: true,
    lifecycleStatus: "ONBOARDING",
    addressLine: null,
    createdAt: "2026-05-20T10:00:00.000Z",
    updatedAt: "2026-05-20T10:00:00.000Z",
    deletedAt: null,
    ...overrides,
  };
}

function makeCompaniesResponse(overrides: Partial<CompanyListResponse> = {}): CompanyListResponse {
  return {
    data: [makeCompany()],
    meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    ...overrides,
  };
}

function mockApi() {
  apiGetMock.mockImplementation((path: string) => {
    if (path === "companies") return jsonResponse(makeCompaniesResponse());
    throw new Error(`Unexpected path: ${path}`);
  });
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AdminCompaniesPage />
    </QueryClientProvider>,
  );
}

describe("AdminCompaniesPage", () => {
  afterEach(() => {
    cleanup();
    navigateMock.mockReset();
    apiGetMock.mockReset();
    Object.assign(searchState, { page: 1, pageSize: 10, q: undefined });
  });

  it("renders companies with lifecycle and active status from the real hook", async () => {
    mockApi();
    renderPage();

    expect(await screen.findByRole("heading", { name: "Nexus Technologies" })).toBeInTheDocument();
    expect(screen.getAllByText("NEXUS").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Onboarding").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Enabled").length).toBeGreaterThan(0);
    expect(apiGetMock).not.toHaveBeenCalledWith("company-configs");
  });

  it("reflects backend totals via useCompanies, not client-side slicing", async () => {
    apiGetMock.mockImplementation((path: string) => {
      if (path === "companies") {
        return jsonResponse(
          makeCompaniesResponse({ meta: { page: 2, limit: 10, total: 42, totalPages: 5 } }),
        );
      }
      throw new Error(`Unexpected path: ${path}`);
    });
    renderPage();

    expect(await screen.findByText("2 / 5")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /next page/i }));

    await waitFor(() => expect(navigateMock).toHaveBeenCalled());
    const search = navigateMock.mock.calls.at(-1)?.[0].search;
    expect(search({ page: 2, pageSize: 10 })).toEqual(expect.objectContaining({ page: 3 }));
  });

  it("navigates to the company detail view when View is clicked", async () => {
    mockApi();
    renderPage();
    await screen.findByRole("heading", { name: "Nexus Technologies" });

    fireEvent.click(screen.getAllByRole("button", { name: /^view$/i })[0]);

    expect(navigateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "/admin/companies/$publicId",
        params: { publicId: "company-1" },
      }),
    );
  });
});
