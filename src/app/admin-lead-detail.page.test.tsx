import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { LeadActivityListResponse, LeadWithContacts } from "@/admin/leads/api";
import { AdminLeadDetailPage } from "./admin-lead-detail.page";

const navigateMock = vi.hoisted(() => vi.fn());
const apiGetMock = vi.hoisted(() => vi.fn());

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useParams: () => ({ publicId: "lead-1" }),
  };
});

// `ky` (the apiClient's HTTP layer) constructs AbortSignals that jsdom's fetch
// rejects as cross-realm — stub the client boundary instead of the network.
vi.mock("@/api/client", () => ({
  apiClient: {
    get: apiGetMock,
  },
}));

function jsonResponse<T>(value: T) {
  return { json: () => Promise.resolve(value) };
}

const leadWithContacts: LeadWithContacts = {
  lead: {
    publicId: "lead-1",
    companyName: "Acme Corp",
    website: "https://acme.example.com",
    industry: "Retail",
    companySizeRange: "21_TO_50",
    country: "Egypt",
    city: "Cairo",
    source: "REFERRAL",
    status: "NEGOTIATION",
    lostReason: null,
    ownerUserId: null,
    numberOfAttempts: 3,
    companyId: null,
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-06-10T00:00:00.000Z",
    deletedAt: null,
  },
  contacts: [
    {
      publicId: "contact-1",
      name: "Sara Youssef",
      email: "sara@acme.example.com",
      phone: "0100000000",
      jobTitle: "COO",
      isPrimary: true,
    },
  ],
};

function activitiesResponse(): LeadActivityListResponse {
  return {
    items: [
      {
        publicId: "activity-1",
        leadId: 1,
        type: "MEETING",
        note: "Kickoff call with the COO",
        createdAt: "2026-06-09T09:00:00.000Z",
        updatedAt: "2026-06-09T09:00:00.000Z",
        deletedAt: null,
      },
    ],
    meta: { mode: "page", page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
  };
}

function mockApiForLead() {
  apiGetMock.mockImplementation((path: string) => {
    if (path === "leads/lead-1") return jsonResponse(leadWithContacts);
    if (path === "leads/lead-1/activities") return jsonResponse(activitiesResponse());
    throw new Error(`Unexpected path: ${path}`);
  });
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AdminLeadDetailPage />
    </QueryClientProvider>,
  );
}

describe("AdminLeadDetailPage", () => {
  afterEach(() => {
    cleanup();
    navigateMock.mockReset();
    apiGetMock.mockReset();
  });

  it("renders the lead profile, contacts, and activity timeline from the real hooks", async () => {
    mockApiForLead();
    renderPage();

    expect(await screen.findByRole("heading", { name: "Acme Corp" })).toBeInTheDocument();
    expect(screen.getAllByText("Negotiation").length).toBeGreaterThan(0);
    expect(screen.getByText("Referral")).toBeInTheDocument();
    expect(screen.getByText("Sara Youssef")).toBeInTheDocument();
    expect(screen.getByText("Primary")).toBeInTheDocument();
    expect(screen.getByText("Kickoff call with the COO")).toBeInTheDocument();
    expect(screen.getByText("Meeting")).toBeInTheDocument();
  });

  it("shows an empty state when the lead has no logged activity", async () => {
    apiGetMock.mockImplementation((path: string) => {
      if (path === "leads/lead-1") return jsonResponse(leadWithContacts);
      if (path === "leads/lead-1/activities")
        return jsonResponse({
          items: [],
          meta: { mode: "page", page: 1, pageSize: 20, totalItems: 0, totalPages: 1 },
        });
      throw new Error(`Unexpected path: ${path}`);
    });

    renderPage();

    expect(await screen.findByText(/no activity yet/i)).toBeInTheDocument();
  });

  it("navigates back to the leads list", async () => {
    mockApiForLead();
    renderPage();
    await screen.findByRole("heading", { name: "Acme Corp" });

    fireEvent.click(screen.getByRole("button", { name: /back to leads/i }));

    expect(navigateMock).toHaveBeenCalledWith(expect.objectContaining({ to: "/admin/leads" }));
  });
});
