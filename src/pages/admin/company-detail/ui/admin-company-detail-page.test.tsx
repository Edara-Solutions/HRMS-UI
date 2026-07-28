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

function subscriptionState() {
  return {
    subscription: {
      publicId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      companyPublicId: "company-1",
      plan: { publicId: "plan-1", name: "Full Access", duration: 30 },
      status: "TRIAL",
      startDate: "2026-05-20T10:00:00.000Z",
      endDate: null,
      initialTrialEndDate: "2026-06-20T00:00:00.000Z",
      trialEndDate: "2026-06-20T00:00:00.000Z",
      note: null,
      createdAt: "2026-05-20T10:00:00.000Z",
      updatedAt: "2026-05-20T10:00:00.000Z",
    },
    history: [
      {
        publicId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        type: "TRIAL_STARTED",
        plan: { publicId: "plan-1", name: "Full Access", duration: 30 },
        oldStatus: null,
        newStatus: "TRIAL",
        oldTrialEndDate: null,
        newTrialEndDate: "2026-06-20T00:00:00.000Z",
        actorUserId: 1,
        reason: "Initial onboarding trial",
        occurredAt: "2026-05-20T10:00:00.000Z",
      },
    ],
  };
}

function accessPolicyState() {
  return {
    policy: {
      publicId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      companyPublicId: "company-1",
      mode: "NORMAL",
      reason: "Default access",
      note: null,
      effectiveFrom: "2026-05-20T10:00:00.000Z",
      effectiveUntil: null,
      changedByUserId: 1,
      createdAt: "2026-05-20T10:00:00.000Z",
      updatedAt: "2026-05-20T10:00:00.000Z",
      source: "policy",
    },
    effectiveMode: "NORMAL",
    effectiveAt: "2026-07-28T10:00:00.000Z",
    isCurrentlyEffective: true,
    isExpired: false,
    legacyMapping: null,
  };
}

function activationState() {
  return {
    companyPublicId: "company-1",
    lifecycleStatus: "ONBOARDING",
    activatedAt: null,
    canActivate: false,
    unmetRequirements: [
      {
        code: "SUBSCRIPTION_NOT_ACTIVATABLE",
        message: "Trial is expired.",
        details: {},
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
    if (path === "companies/company-1/subscription") return jsonResponse(subscriptionState());
    if (path === "companies/company-1/access-policy") return jsonResponse(accessPolicyState());
    if (path === "companies/company-1/activation") return jsonResponse(activationState());
    if (path === "companies/company-1/sending-domain") {
      return jsonResponse({
        domain: "mail.nexustech.sa",
        status: "VERIFIED",
        health: "HEALTHY",
        dnsRecords: [
          {
            kind: "OWNERSHIP_TXT",
            host: "_edara-verify.mail.nexustech.sa",
            recordType: "TXT",
            value: "edara-verify=nexus",
            description: "Ownership record",
          },
          {
            kind: "DKIM",
            host: "edara._domainkey.mail.nexustech.sa",
            recordType: "CNAME",
            value: "edara.example",
            description: "DKIM record",
          },
        ],
        checkResults: [
          { kind: "OWNERSHIP_TXT", status: "VERIFIED", failureDetail: null },
          { kind: "DKIM", status: "VERIFIED", failureDetail: null },
        ],
        verifiedAt: "2026-06-01T10:00:00.000Z",
        lastFailure: null,
        createdAt: "2026-05-20T10:00:00.000Z",
        updatedAt: "2026-06-01T10:00:00.000Z",
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
    expect(await screen.findByText("Verified sending domain")).toBeInTheDocument();
    expect(screen.getByText("mail.nexustech.sa")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "DNS check timeline" })).toBeInTheDocument();
    expect(screen.getByText("Ownership TXT")).toBeInTheDocument();
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
