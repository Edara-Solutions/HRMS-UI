import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Company, CompanyConfigListResponse } from "../api/company-detail";
import { AdminCompanyDetailPage } from "./admin-company-detail-page";

const navigateMock = vi.hoisted(() => vi.fn());
const apiGetMock = vi.hoisted(() => vi.fn());
const apiPatchMock = vi.hoisted(() => vi.fn());
const usePlansMock = vi.hoisted(() => vi.fn());

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useParams: () => ({ publicId: "company-1" }),
  };
});

// `ky` (the apiClient's HTTP layer) constructs AbortSignals that jsdom's fetch
// rejects as cross-realm — stub the client boundary instead of the network.
vi.mock("@/shared/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api")>()),
  apiClient: {
    get: apiGetMock,
    patch: apiPatchMock,
  },
  usePlans: usePlansMock,
}));

function jsonResponse<T>(value: T) {
  return { json: () => Promise.resolve(value) };
}

const company: Company = {
  publicId: "company-1",
  logo: null,
  name: "Nexus Technologies",
  website: "https://nexustech.sa",
  phoneNumber: "+966112345678",
  country: "Saudi Arabia",
  companyCode: "NEXUS",
  isActive: true,
  addressLine: "King Fahd Road, Riyadh",
  createdAt: "2026-05-20T10:00:00.000Z",
  updatedAt: "2026-05-20T10:00:00.000Z",
  deletedAt: null,
};

function configsResponse(): CompanyConfigListResponse {
  return {
    data: [
      {
        public_id: "config-1",
        companyId: 1,
        planId: 1,
        subscriptionStatus: "TRIAL",
        siteStatus: {
          isFrozen: false,
          isReadOnly: false,
          isBlocked: false,
          isUnderMaintenance: false,
          note: null,
        },
        subscriptionStartDate: null,
        subscriptionEndDate: null,
        trialEndDate: "2026-06-20T00:00:00.000Z",
        subscriptionNotes: null,
        createdAt: "2026-05-20T10:00:00.000Z",
        updatedAt: "2026-05-20T10:00:00.000Z",
        deletedAt: null,
        company: {
          publicId: "company-1",
          name: "Nexus Technologies",
          companyCode: "NEXUS",
          country: "Saudi Arabia",
          isActive: true,
          phoneNumber: "+966112345678",
        },
        plan: {
          publicId: "plan-1",
          name: "Full Access",
          duration: 30,
          features: [],
          limits: {},
          isPublic: false,
          isActive: true,
        },
      },
    ],
  };
}

function plansResponse() {
  return {
    data: [
      {
        publicId: "plan-1",
        name: "Full Access",
        description: null,
        duration: 30,
        features: [],
        limits: {},
        isPublic: false,
        isActive: true,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        deletedAt: null,
      },
      {
        publicId: "plan-2",
        name: "Starter",
        description: null,
        duration: 30,
        features: [],
        limits: {},
        isPublic: true,
        isActive: true,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        deletedAt: null,
      },
    ],
  };
}

function mockApi() {
  usePlansMock.mockReturnValue({ data: plansResponse() });
  apiGetMock.mockImplementation((path: string) => {
    if (path === "companies/company-1") return jsonResponse(company);
    if (path === "company-configs") return jsonResponse(configsResponse());
    if (path === "plans") return jsonResponse(plansResponse());
    if (path === "email-types") {
      return jsonResponse({
        items: [
          {
            key: "employee-invitation",
            context: "COMPANY",
            supportedLocales: ["en", "ar"],
          },
        ],
      });
    }
    if (path === "email-types/employee-invitation/preview") {
      return jsonResponse({
        senderIdentity: {
          name: "Nexus Technologies",
          address: "people@nexus.example",
          replyTo: "support@nexus.example",
        },
      });
    }
    throw new Error(`Unexpected path: ${path}`);
  });
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AdminCompanyDetailPage />
    </QueryClientProvider>,
  );
}

describe("AdminCompanyDetailPage", () => {
  afterEach(() => {
    cleanup();
    navigateMock.mockReset();
    apiGetMock.mockReset();
    apiPatchMock.mockReset();
    usePlansMock.mockReset();
  });

  it("renders the company profile and subscription from the real hooks", async () => {
    mockApi();
    renderPage();

    expect(await screen.findByRole("heading", { name: "Nexus Technologies" })).toBeInTheDocument();
    expect(screen.getAllByText("NEXUS").length).toBeGreaterThan(0);
    expect(screen.getByText("Trial")).toBeInTheDocument();
    expect(screen.getByText("Full Access")).toBeInTheDocument();
    expect(await screen.findByText("Sender identity available")).toBeInTheDocument();
    expect(screen.getByText("Nexus Technologies <people@nexus.example>")).toBeInTheDocument();
  });

  it("edits the company profile without exposing the company code as editable", async () => {
    mockApi();
    apiPatchMock.mockReturnValue(jsonResponse({ message: "ok" }));
    renderPage();
    await screen.findByRole("heading", { name: "Nexus Technologies" });

    fireEvent.click(screen.getAllByRole("button", { name: /^edit$/i })[0]);
    expect(screen.queryByLabelText(/company code/i)).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/company name/i), {
      target: { value: "Nexus Tech Renamed" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() =>
      expect(apiPatchMock).toHaveBeenCalledWith(
        "companies/company-1",
        expect.objectContaining({
          json: expect.objectContaining({ name: "Nexus Tech Renamed" }),
        }),
      ),
    );
  });

  it("edits the subscription config, including switching the plan by its public id", async () => {
    mockApi();
    apiPatchMock.mockReturnValue(jsonResponse({ message: "ok" }));
    renderPage();
    await screen.findByRole("heading", { name: "Nexus Technologies" });

    fireEvent.click(screen.getAllByRole("button", { name: /^edit$/i })[1]);

    fireEvent.click(screen.getByLabelText(/^plan$/i));
    fireEvent.click(await screen.findByRole("option", { name: "Starter" }));
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() =>
      expect(apiPatchMock).toHaveBeenCalledWith(
        "company-configs/config-1",
        expect.objectContaining({
          json: expect.objectContaining({ planPublicId: "plan-2" }),
        }),
      ),
    );
  });
});
