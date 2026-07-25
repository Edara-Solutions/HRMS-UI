import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { HTTPError } from "ky";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LeadActivityListResponse, LeadDetails } from "../api/lead-detail";
import type { SendingDomain, SendingDomainReadiness } from "../api/sending-domain";
import { AdminLeadDetailPage } from "./admin-lead-detail-page";

const navigateMock = vi.hoisted(() => vi.fn());
const apiGetMock = vi.hoisted(() => vi.fn());
const apiDeleteMock = vi.hoisted(() => vi.fn());
const apiPatchMock = vi.hoisted(() => vi.fn());
const apiPostMock = vi.hoisted(() => vi.fn());

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useParams: () => ({ publicId: "lead-1" }),
  };
});

// `ky` (the apiClient's HTTP layer) constructs AbortSignals that jsdom's fetch
// rejects as cross-realm - stub the client boundary instead of the network.
vi.mock("@/shared/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api")>()),
  apiClient: {
    get: apiGetMock,
    delete: apiDeleteMock,
    patch: apiPatchMock,
    post: apiPostMock,
  },
}));

function jsonResponse<T>(value: T) {
  return { json: () => Promise.resolve(value) };
}

function errorResponse(status: number, body: unknown) {
  const options: ConstructorParameters<typeof HTTPError>[2] = {
    method: "GET",
    retry: { limit: 0 },
    prefixUrl: "",
    onDownloadProgress: undefined,
    onUploadProgress: undefined,
    context: {},
  };

  return {
    json: () =>
      Promise.reject(
        new HTTPError(
          new Response(JSON.stringify(body), { status }),
          new Request("http://localhost/leads/lead-1/sending-domain"),
          options,
        ),
      ),
  };
}

function buildLeadDetails(overrides: Partial<LeadDetails["lead"]> = {}): LeadDetails {
  return {
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
      lastAttemptAt: "2026-06-10T00:00:00.000Z",
      isArchived: false,
      createdAt: "2026-05-01T00:00:00.000Z",
      updatedAt: "2026-06-10T00:00:00.000Z",
      deletedAt: null,
      ...overrides,
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
    primaryContact: {
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
    conversionEligibility: {
      isEligible: true,
      reasons: [],
      primaryContact: null,
    },
  };
}

function buildSendingDomain(overrides: Partial<SendingDomain> = {}): SendingDomain {
  return {
    publicId: "domain-1",
    owner: "LEAD",
    ownerPublicId: "lead-1",
    domain: "mail.acme.example.com",
    status: "VERIFIED",
    health: "HEALTHY",
    dnsRecords: [
      {
        kind: "OWNERSHIP_TXT",
        host: "_edara.mail.acme.example.com",
        recordType: "TXT",
        value: "edara-verification=abc123",
        description: "Proves that Edara can send for this domain.",
      },
    ],
    checkResults: [{ kind: "OWNERSHIP_TXT", status: "VERIFIED", failureDetail: null }],
    verifiedAt: "2026-06-10T00:00:00.000Z",
    providerReference: null,
    lastFailure: null,
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-10T00:00:00.000Z",
    ...overrides,
  };
}

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

function mockApiForLead(
  details = buildLeadDetails(),
  readiness: SendingDomainReadiness = { ready: true },
  sendingDomain = buildSendingDomain(),
) {
  apiGetMock.mockImplementation((path: string) => {
    if (path === "leads/lead-1") return jsonResponse(details);
    if (path === "leads/lead-1/activities") return jsonResponse(activitiesResponse());
    if (path === "leads/lead-1/conversion-eligibility") {
      return jsonResponse(details.conversionEligibility);
    }
    if (path === "leads/lead-1/sending-domain") return jsonResponse(sendingDomain);
    if (path === "leads/lead-1/sending-domain/readiness") return jsonResponse(readiness);
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
  beforeEach(() => {
    vi.stubEnv("ALLOW_CONVERT_LEAD_TO_COMPANY_FROM_ANY_STATE", "false");
  });

  afterEach(() => {
    cleanup();
    navigateMock.mockReset();
    apiGetMock.mockReset();
    apiDeleteMock.mockReset();
    apiPatchMock.mockReset();
    apiPostMock.mockReset();
    vi.unstubAllEnvs();
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

  it("renders a safe fallback and disables editing for an unknown lead status", async () => {
    const details = buildLeadDetails();
    details.lead.status = "FUTURE_PIPELINE_STATE" as LeadDetails["lead"]["status"];
    mockApiForLead(details);
    renderPage();

    expect(await screen.findByText("future pipeline state")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Edit" })[0]).toBeDisabled();
  });
  it("renders every conversion blocker returned by the server", async () => {
    const details = buildLeadDetails();
    details.conversionEligibility = {
      isEligible: false,
      reasons: [
        { code: "PRIMARY_CONTACT_NAME_REQUIRED", message: "Primary contact name is required." },
        { code: "PRIMARY_CONTACT_EMAIL_REQUIRED", message: "Primary contact email is required." },
      ],
      primaryContact: null,
    };
    mockApiForLead(details);
    renderPage();

    expect(await screen.findByText("Primary contact name is required.")).toBeInTheDocument();
    expect(screen.getByText("Primary contact email is required.")).toBeInTheDocument();
  });

  it("refreshes authoritative conversion eligibility on demand", async () => {
    mockApiForLead();
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Refresh eligibility" }));

    await waitFor(() => {
      expect(
        apiGetMock.mock.calls.filter(([path]) => path === "leads/lead-1/conversion-eligibility"),
      ).toHaveLength(2);
    });
  });

  it("archives using the idempotent command and renders returned state", async () => {
    mockApiForLead();
    apiPostMock.mockReturnValue(jsonResponse(buildLeadDetails({ isArchived: true })));
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Archive" }));

    await waitFor(() => {
      expect(apiPostMock).toHaveBeenCalledWith("leads/lead-1/archive");
    });
  });

  it("requires promotion before deleting the primary contact", async () => {
    mockApiForLead();
    renderPage();

    const removeButtons = await screen.findAllByRole("button", { name: "Remove" });
    fireEvent.click(removeButtons[0]);

    expect(screen.getByText("Promote another contact first")).toBeInTheDocument();
    expect(apiDeleteMock).not.toHaveBeenCalled();
  });
  it("renders DNS instructions and copies a host value", async () => {
    mockApiForLead();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    renderPage();

    expect(await screen.findByText("mail.acme.example.com")).toBeInTheDocument();
    expect(screen.getByText("Domain ownership")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Copy host" }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith("_edara.mail.acme.example.com"));
  });

  it("provisions an unconfigured sending domain from the lead detail card", async () => {
    apiGetMock.mockImplementation((path: string) => {
      if (path === "leads/lead-1") return jsonResponse(buildLeadDetails());
      if (path === "leads/lead-1/activities") return jsonResponse(activitiesResponse());
      if (path === "leads/lead-1/conversion-eligibility") {
        return jsonResponse(buildLeadDetails().conversionEligibility);
      }
      if (path === "leads/lead-1/sending-domain") {
        return errorResponse(404, { error: "No sending domain provisioned for this lead" });
      }
      if (path === "leads/lead-1/sending-domain/readiness") {
        return jsonResponse({ ready: false, reason: "NOT_PROVISIONED" });
      }
      throw new Error(`Unexpected path: ${path}`);
    });
    apiPostMock.mockReturnValue(jsonResponse(buildSendingDomain()));
    renderPage();

    const domainInput = await screen.findByLabelText("Company sending domain");
    expect(domainInput).toHaveValue("acme.example.com");
    fireEvent.click(screen.getByRole("button", { name: /provision domain/i }));

    await waitFor(() =>
      expect(apiPostMock).toHaveBeenCalledWith(
        "leads/lead-1/sending-domain",
        expect.objectContaining({ json: { domain: "acme.example.com" } }),
      ),
    );
  });

  it("lets the operator verify and refresh DNS without leaving the lead", async () => {
    mockApiForLead();
    apiPostMock.mockReturnValue(jsonResponse(buildSendingDomain()));
    renderPage();

    await screen.findByRole("heading", { name: "Acme Corp" });
    fireEvent.click(await screen.findByRole("button", { name: /recheck dns/i }));

    await waitFor(() =>
      expect(apiPostMock).toHaveBeenCalledWith("leads/lead-1/sending-domain/verify"),
    );
    fireEvent.click(screen.getByRole("button", { name: /refresh sending-domain status/i }));

    expect(screen.getByRole("heading", { name: "Acme Corp" })).toBeInTheDocument();
  });

  it("shows pending and failed states for individual DNS checks", async () => {
    mockApiForLead(
      buildLeadDetails({ status: "QUALIFIED" }),
      { ready: false, reason: "UNHEALTHY" },
      buildSendingDomain({
        status: "FAILED",
        health: "UNHEALTHY",
        dnsRecords: [
          {
            kind: "OWNERSHIP_TXT",
            host: "_edara.mail.acme.example.com",
            recordType: "TXT",
            value: "edara-verification=abc123",
            description: "Proves that Edara can send for this domain.",
          },
          {
            kind: "DKIM",
            host: "selector._domainkey.mail.acme.example.com",
            recordType: "CNAME",
            value: "selector.dkim.edara.example.com",
            description: "Authorizes Edara to sign messages for this domain.",
          },
        ],
        checkResults: [
          { kind: "OWNERSHIP_TXT", status: "PENDING", failureDetail: null },
          { kind: "DKIM", status: "FAILED", failureDetail: "CNAME not found" },
        ],
      }),
    );
    renderPage();

    expect(await screen.findByText("pending")).toBeInTheDocument();
    expect(screen.getByText("CNAME not found")).toBeInTheDocument();
  });

  it("shows an empty state when the lead has no logged activity", async () => {
    apiGetMock.mockImplementation((path: string) => {
      if (path === "leads/lead-1") return jsonResponse(buildLeadDetails());
      if (path === "leads/lead-1/activities") {
        return jsonResponse({
          items: [],
          meta: { mode: "page", page: 1, pageSize: 20, totalItems: 0, totalPages: 1 },
        });
      }
      if (path === "leads/lead-1/sending-domain") return jsonResponse(buildSendingDomain());
      if (path === "leads/lead-1/sending-domain/readiness") return jsonResponse({ ready: true });
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
      jsonResponse({ ...buildLeadDetails().contacts[1], isPrimary: true }),
    );
    renderPage();
    await screen.findByRole("heading", { name: "Acme Corp" });

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

    fireEvent.click(screen.getAllByRole("button", { name: /^remove$/i })[1]);
    fireEvent.click(screen.getByRole("button", { name: /remove contact/i }));

    await waitFor(() =>
      expect(apiDeleteMock).toHaveBeenCalledWith("leads/lead-1/contacts/contact-2"),
    );
  });
});
