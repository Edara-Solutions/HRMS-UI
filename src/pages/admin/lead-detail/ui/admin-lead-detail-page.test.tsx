import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { LeadActivityListResponse, LeadDetails } from "../api/lead-detail";
import { AdminLeadDetailPage } from "./admin-lead-detail-page";

const navigateMock = vi.hoisted(() => vi.fn());
const apiGetMock = vi.hoisted(() => vi.fn());
const apiDeleteMock = vi.hoisted(() => vi.fn());
const apiPatchMock = vi.hoisted(() => vi.fn());

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
vi.mock("@/shared/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api")>()),
  apiClient: {
    get: apiGetMock,
    delete: apiDeleteMock,
    patch: apiPatchMock,
  },
}));

function jsonResponse<T>(value: T) {
  return { json: () => Promise.resolve(value) };
}

const leadWithContacts: LeadDetails = {
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
    isConverted: false,
    numberOfAttempts: 3,
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
      createdAt: "2026-05-01T00:00:00.000Z",
      updatedAt: "2026-05-01T00:00:00.000Z",
      deletedAt: null,
    },
    {
      publicId: "contact-2",
      name: "Omar Hassan",
      email: "omar@acme.example.com",
      phone: "0111111111",
      jobTitle: "CFO",
      isPrimary: false,
      createdAt: "2026-05-01T00:00:00.000Z",
      updatedAt: "2026-05-01T00:00:00.000Z",
      deletedAt: null,
    },
  ],
  activities: [],
};

function activitiesResponse(): LeadActivityListResponse {
  return {
    items: [
      {
        publicId: "activity-1",
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
    apiDeleteMock.mockReset();
    apiPatchMock.mockReset();
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
    expect(screen.getByText("Meeting", { selector: "span" })).toBeInTheDocument();
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

  it("deletes the lead after confirmation and navigates back to the list", async () => {
    mockApiForLead();
    apiDeleteMock.mockResolvedValue(undefined);
    renderPage();
    await screen.findByRole("heading", { name: "Acme Corp" });

    fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));
    fireEvent.click(screen.getByRole("button", { name: /delete lead/i }));

    await waitFor(() => expect(apiDeleteMock).toHaveBeenCalledWith("leads/lead-1"));
    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith(expect.objectContaining({ to: "/admin/leads" })),
    );
  });

  it("makes a non-primary contact primary with a single action", async () => {
    mockApiForLead();
    apiPatchMock.mockReturnValue(
      jsonResponse({ ...leadWithContacts.contacts[1], isPrimary: true }),
    );
    renderPage();
    await screen.findByRole("heading", { name: "Acme Corp" });

    // Only the non-primary contact (Omar) is offered "Make primary".
    fireEvent.click(screen.getByRole("button", { name: /make primary/i }));

    await waitFor(() =>
      expect(apiPatchMock).toHaveBeenCalledWith(
        "leads/lead-1/contacts/contact-2",
        expect.objectContaining({ json: { isPrimary: true } }),
      ),
    );
  });

  it("removes a contact after confirmation", async () => {
    mockApiForLead();
    apiDeleteMock.mockResolvedValue(undefined);
    renderPage();
    await screen.findByRole("heading", { name: "Acme Corp" });

    fireEvent.click(screen.getAllByRole("button", { name: /^remove$/i })[0]);
    fireEvent.click(screen.getByRole("button", { name: /remove contact/i }));

    await waitFor(() =>
      expect(apiDeleteMock).toHaveBeenCalledWith("leads/lead-1/contacts/contact-1"),
    );
  });
});
