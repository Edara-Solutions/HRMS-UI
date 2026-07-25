import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { HTTPError } from "ky";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/shared/auth";
import { ConversionSubmissionCard } from "./conversion-submission-card";

const apiGetMock = vi.hoisted(() => vi.fn());
const apiPostMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api")>()),
  apiClient: { get: apiGetMock, post: apiPostMock },
}));

const PLAN = {
  publicId: "11111111-1111-4111-8111-111111111111",
  name: "Growth",
  description: "For growing teams",
  duration: 30,
  features: ["OVERVIEW"],
  limits: { MAX_USERS: 100 },
  isPublic: true,
  isActive: true,
  prices: [],
  effectivePrice: null,
  createdAt: "2026-07-25T10:00:00.000Z",
  updatedAt: "2026-07-25T10:00:00.000Z",
  deletedAt: null,
};

const PENDING_REQUEST = {
  publicId: "33333333-3333-4333-8333-333333333333",
  status: "PENDING",
  lead: { publicId: "lead-1" },
  plan: { publicId: PLAN.publicId, name: PLAN.name },
};

function jsonResponse(value: unknown) {
  return { json: () => Promise.resolve(value) };
}

function errorResponse(status: number, body: unknown) {
  const options: ConstructorParameters<typeof HTTPError>[2] = {
    method: "POST",
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
          new Request("http://localhost/lead-conversion-requests/immediate"),
          options,
        ),
      ),
  };
}

function setPermissions(permissions: string[], isPlatformAdmin = false) {
  useAuthStore.setState({
    status: "authenticated",
    session: {
      accessToken: "token",
      refreshToken: "refresh",
      sessionId: "session-1",
      expiresIn: 900,
      user: {
        publicId: "admin-1",
        employeeCode: "ADMIN-001",
        firstName: "Nadia",
        lastName: "Hassan",
        email: "nadia@example.com",
        status: "ACTIVE",
        companyCode: "EDARA",
        mustChangePassword: false,
        permissions,
        isOwner: false,
        isPlatformAdmin,
      },
    },
  });
}

function renderCard(
  refreshEligibility = vi.fn().mockResolvedValue({ isEligible: true, reasons: [] }),
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <ConversionSubmissionCard leadPublicId="lead-1" refreshEligibility={refreshEligibility} />
    </QueryClientProvider>,
  );
  return refreshEligibility;
}

async function selectGrowthPlan() {
  const planSelect = await screen.findByRole("combobox", { name: "Conversion plan" });
  await waitFor(() => expect(planSelect).toBeEnabled());
  fireEvent.click(planSelect);
  fireEvent.click(await screen.findByRole("option", { name: "Growth" }));
}

describe("ConversionSubmissionCard", () => {
  beforeEach(() => {
    apiGetMock.mockImplementation((path: string) => {
      if (path === "plans/public") return jsonResponse({ data: [PLAN] });
      if (path === "lead-conversion-requests") {
        return jsonResponse({
          items: [],
          meta: { mode: "page", page: 1, pageSize: 100, totalItems: 0, totalPages: 0 },
        });
      }
      throw new Error(`Unexpected path: ${path}`);
    });
  });

  afterEach(() => {
    cleanup();
    apiGetMock.mockReset();
    apiPostMock.mockReset();
    useAuthStore.setState({ session: null, status: "anonymous" });
  });

  it("refreshes eligibility and submits only public identifiers on the pending path", async () => {
    setPermissions(["REQUEST_LEAD_CONVERSION"]);
    apiPostMock.mockReturnValue(jsonResponse(PENDING_REQUEST));
    const refreshEligibility = renderCard();
    await selectGrowthPlan();

    fireEvent.click(screen.getByRole("button", { name: "Submit for review" }));

    await waitFor(() => expect(refreshEligibility).toHaveBeenCalledOnce());
    expect(apiPostMock).toHaveBeenCalledWith("lead-conversion-requests", {
      json: { leadPublicId: "lead-1", planPublicId: PLAN.publicId },
    });
    expect(await screen.findByText("Conversion request submitted for review.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Convert immediately" })).not.toBeInTheDocument();
  });

  it("does not submit when refreshed eligibility returns blockers", async () => {
    setPermissions(["REQUEST_LEAD_CONVERSION"]);
    renderCard(
      vi.fn().mockResolvedValue({
        isEligible: false,
        reasons: [{ code: "BLOCKED", message: "Lead is blocked." }],
      }),
    );
    await selectGrowthPlan();

    fireEvent.click(screen.getByRole("button", { name: "Submit for review" }));

    expect(
      await screen.findByText("Conversion eligibility changed. Resolve every blocker shown above."),
    ).toBeInTheDocument();
    expect(apiPostMock).not.toHaveBeenCalled();
  });

  it("recovers a committed pending request after an immediate conversion error", async () => {
    setPermissions(["AUTO_APPROVE_LEAD_CONVERSION", "APPROVE_LEAD_CONVERSION_REQUEST"]);
    apiGetMock.mockImplementation((path: string) => {
      if (path === "plans/public") return jsonResponse({ data: [PLAN] });
      if (path === "lead-conversion-requests") {
        return jsonResponse({
          items: [PENDING_REQUEST],
          meta: { mode: "page", page: 1, pageSize: 100, totalItems: 1, totalPages: 1 },
        });
      }
      throw new Error(`Unexpected path: ${path}`);
    });
    apiPostMock.mockReturnValue(errorResponse(500, { error: "Provisioning failed" }));
    renderCard();
    await selectGrowthPlan();

    fireEvent.click(screen.getByRole("button", { name: "Convert immediately" }));

    expect(
      await screen.findByText(
        "Immediate conversion did not finish. The committed pending request is ready for reviewer recovery.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(PENDING_REQUEST.publicId, { exact: false })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Submit for review" })).not.toBeInTheDocument();
  });
});
