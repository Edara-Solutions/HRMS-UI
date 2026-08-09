import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Company } from "../api/company-detail";
import { AdminCompanyDetailPage } from "./admin-company-detail-page";

const navigateMock = vi.hoisted(() => vi.fn());
const apiGetMock = vi.hoisted(() => vi.fn());
const apiPatchMock = vi.hoisted(() => vi.fn());

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

function companyProfile() {
  return {
    publicId: "profile-1",
    companyPublicId: "company-1",
    name: "Nexus Technologies Legal",
    logoUrl: null,
    email: "ops@nexustech.sa",
    phone: "+966112345678",
    country: "Saudi Arabia",
    city: "Riyadh",
    addressLine: "King Fahd Road, Riyadh",
    taxNumber: "TAX-123",
    commercialNumber: "CR-456",
    status: "COMPLETE",
    createdAt: "2026-05-20T10:00:00.000Z",
    updatedAt: "2026-05-21T10:00:00.000Z",
  };
}

function setupState() {
  return {
    companyPublicId: "company-1",
    templateVersion: 1,
    steps: [
      {
        publicId: "setup-1",
        stepType: "SET_COMPANY_PROFILE",
        status: "COMPLETED",
        isRequired: true,
        sequence: 1,
        templateVersion: 1,
        dependencies: [],
        startedAt: "2026-05-20T10:00:00.000Z",
        completedAt: "2026-05-21T10:00:00.000Z",
        createdAt: "2026-05-20T10:00:00.000Z",
        updatedAt: "2026-05-21T10:00:00.000Z",
      },
      {
        publicId: "setup-2",
        stepType: "SET_DEPARTMENTS",
        status: "IN_PROGRESS",
        isRequired: true,
        sequence: 2,
        templateVersion: 1,
        dependencies: ["SET_COMPANY_PROFILE"],
        startedAt: "2026-05-22T10:00:00.000Z",
        completedAt: null,
        createdAt: "2026-05-20T10:00:00.000Z",
        updatedAt: "2026-05-22T10:00:00.000Z",
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
function mockApi() {
  apiGetMock.mockImplementation((path: string) => {
    if (path === "companies/company-1") return jsonResponse(company);
    if (path === "companies/company-1/profile") return jsonResponse(companyProfile());
    if (path === "companies/company-1/setup") return jsonResponse(setupState());
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
  });

  it("renders company detail tabs with lazy endpoint-backed panels", async () => {
    mockApi();
    renderPage();

    expect(await screen.findByRole("heading", { name: "Nexus Technologies" })).toBeInTheDocument();
    expect(screen.getAllByText("NEXUS").length).toBeGreaterThan(0);
    expect(screen.getByRole("tab", { name: "Profile" })).toHaveAttribute("aria-selected", "true");
    expect(await screen.findByText("Nexus Technologies Legal")).toBeInTheDocument();
    expect(await screen.findByText("Verified sending domain")).toBeInTheDocument();
    expect(screen.getByText("mail.nexustech.sa")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "DNS check timeline" })).toBeInTheDocument();
    expect(screen.getByText("Ownership TXT")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Setup" }));
    expect(await screen.findByRole("heading", { name: "Company setup" })).toBeInTheDocument();
    expect(await screen.findByText("Departments")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Subscription" }));
    expect(
      await screen.findByRole("heading", { name: "Company subscription" }),
    ).toBeInTheDocument();
    expect(await screen.findByText("Full Access")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Access & activation" }));
    expect(await screen.findByRole("heading", { name: "Access & activation" })).toBeInTheDocument();
    expect(screen.getByText("Trial is expired.")).toBeInTheDocument();
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
});
