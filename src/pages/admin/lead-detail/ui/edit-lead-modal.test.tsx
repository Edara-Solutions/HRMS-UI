import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Lead } from "../api/lead-detail";
import { EditLeadModal } from "./edit-lead-modal";

const updatePatchMock = vi.hoisted(() => vi.fn());
const geoMocks = vi.hoisted(() => ({
  GetCountries: vi.fn(),
  GetState: vi.fn(),
}));

// `ky` (the apiClient's HTTP layer) constructs AbortSignals that jsdom's fetch
// rejects as cross-realm - stub the client boundary instead of the network.
vi.mock("@/shared/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api")>()),
  apiClient: {
    patch: updatePatchMock,
  },
}));

vi.mock("react-country-state-city/dist/cjs/index.js", () => geoMocks);

function jsonResponse<T>(value: T) {
  return { json: () => Promise.resolve(value) };
}

const lead: Lead = {
  publicId: "lead-1",
  companyName: "Acme Corp",
  website: null,
  industry: null,
  companySizeRange: "21_TO_50",
  country: "Egypt",
  city: "Cairo Governorate",
  source: "CRM",
  status: "QUALIFIED",
  lostReason: null,
  isConverted: false,
  numberOfAttempts: 0,
  lastAttemptAt: "2026-06-01T00:00:00.000Z",
  isArchived: false,
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-01T00:00:00.000Z",
  deletedAt: null,
};

function renderModal(onClose = vi.fn()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <EditLeadModal lead={lead} onClose={onClose} />
    </QueryClientProvider>,
  );
}

describe("EditLeadModal", () => {
  beforeEach(() => {
    vi.stubEnv("ALLOW_LEAD_STATUS_OVERRIDE", "false");
    geoMocks.GetCountries.mockResolvedValue([
      { id: 65, name: "Egypt", emoji: "EG" },
      { id: 233, name: "United States", emoji: "US" },
    ]);
    geoMocks.GetState.mockImplementation((countryId: number) => {
      if (countryId === 233) {
        return Promise.resolve([
          { id: 1456, name: "California" },
          { id: 1457, name: "New York" },
        ]);
      }

      return Promise.resolve([
        { id: 3235, name: "Cairo Governorate" },
        { id: 3236, name: "Alexandria Governorate" },
      ]);
    });
  });

  afterEach(() => {
    cleanup();
    updatePatchMock.mockReset();
    geoMocks.GetCountries.mockReset();
    geoMocks.GetState.mockReset();
    vi.unstubAllEnvs();
  });

  it("pre-fills the current lead fields", async () => {
    renderModal();

    expect(screen.getByLabelText(/company name/i)).toHaveValue("Acme Corp");
    expect(screen.getByLabelText(/status/i)).toHaveTextContent("Qualified");

    await waitFor(() => expect(screen.getByLabelText(/^country$/i)).toHaveTextContent("Egypt"));
    await waitFor(() =>
      expect(screen.getByLabelText(/^state$/i)).toHaveTextContent("Cairo Governorate"),
    );
  });

  it("requires a lost reason when status changes to Lost", async () => {
    renderModal();

    fireEvent.click(screen.getByLabelText(/status/i));
    fireEvent.click(screen.getByRole("option", { name: "Lost" }));
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    expect(await screen.findByText(/lost reason is required/i)).toBeInTheDocument();
    expect(updatePatchMock).not.toHaveBeenCalled();
  });

  it("limits status options to valid transitions when override is disabled", async () => {
    renderModal();

    await waitFor(() => expect(screen.getByLabelText(/^country$/i)).toHaveTextContent("Egypt"));
    fireEvent.click(screen.getByLabelText(/status/i));

    expect(screen.getByRole("option", { name: "Qualified" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Demo scheduled" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Trial" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Negotiation" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Lost" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Contacted" })).not.toBeInTheDocument();
  });

  it("submits the selected country and state as city", async () => {
    updatePatchMock.mockReturnValue(
      jsonResponse({
        lead: { ...lead, country: "United States", city: "California" },
        contacts: [],
      }),
    );

    renderModal();

    await waitFor(() => expect(screen.getByLabelText(/^country$/i)).not.toBeDisabled());
    fireEvent.click(screen.getByLabelText(/^country$/i));
    fireEvent.click(await screen.findByRole("option", { name: /United States/ }));

    await waitFor(() => expect(geoMocks.GetState).toHaveBeenCalledWith(233));
    fireEvent.click(screen.getByLabelText(/^state$/i));
    fireEvent.click(await screen.findByRole("option", { name: "California" }));
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() =>
      expect(updatePatchMock).toHaveBeenCalledWith(
        "leads/lead-1",
        expect.objectContaining({
          json: expect.objectContaining({
            country: "United States",
            city: "California",
          }),
        }),
      ),
    );
  });

  it("submits the status change with the selected lost reason", async () => {
    const onClose = vi.fn();
    updatePatchMock.mockReturnValue(
      jsonResponse({ lead: { ...lead, status: "LOST" }, contacts: [] }),
    );

    renderModal(onClose);

    fireEvent.click(screen.getByLabelText(/status/i));
    fireEvent.click(screen.getByRole("option", { name: "Lost" }));
    fireEvent.click(screen.getByLabelText(/lost reason/i));
    fireEvent.click(screen.getByRole("option", { name: "No budget" }));
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() =>
      expect(updatePatchMock).toHaveBeenCalledWith(
        "leads/lead-1",
        expect.objectContaining({
          json: expect.objectContaining({
            status: "LOST",
            lostReason: "NO_BUDGET",
          }),
        }),
      ),
    );

    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
