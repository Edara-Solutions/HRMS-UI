import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Lead } from "../api/lead-detail";
import { EditLeadModal } from "./edit-lead-modal";

const updatePatchMock = vi.hoisted(() => vi.fn());

// `ky` (the apiClient's HTTP layer) constructs AbortSignals that jsdom's fetch
// rejects as cross-realm - stub the client boundary instead of the network.
vi.mock("@/shared/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api")>()),
  apiClient: {
    patch: updatePatchMock,
  },
}));

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
  city: null,
  source: "CRM",
  status: "QUALIFIED",
  lostReason: null,
  isConverted: false,
  numberOfAttempts: 0,
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
  });

  afterEach(() => {
    cleanup();
    updatePatchMock.mockReset();
    vi.unstubAllEnvs();
  });

  it("pre-fills the current lead fields", () => {
    renderModal();

    expect(screen.getByLabelText(/company name/i)).toHaveValue("Acme Corp");
    expect(screen.getByLabelText(/country/i)).toHaveValue("Egypt");
    expect(screen.getByLabelText(/status/i)).toHaveTextContent("Qualified");
  });

  it("requires a lost reason when status changes to Lost", async () => {
    renderModal();

    fireEvent.click(screen.getByLabelText(/status/i));
    fireEvent.click(screen.getByRole("option", { name: "Lost" }));
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    expect(await screen.findByText(/lost reason is required/i)).toBeInTheDocument();
    expect(updatePatchMock).not.toHaveBeenCalled();
  });

  it("limits status options to valid transitions when override is disabled", () => {
    renderModal();

    fireEvent.click(screen.getByLabelText(/status/i));

    expect(screen.getByRole("option", { name: "Qualified" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Demo scheduled" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Trial" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Negotiation" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Lost" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Contacted" })).not.toBeInTheDocument();
  });

  it("shows every editable status when override is enabled", () => {
    vi.stubEnv("ALLOW_LEAD_STATUS_OVERRIDE", "true");

    renderModal();

    fireEvent.click(screen.getByLabelText(/status/i));

    expect(screen.getByRole("option", { name: "Contacted" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Rejoined" })).not.toBeInTheDocument();
  });

  it("submits allowStatusOverride when override is enabled", async () => {
    vi.stubEnv("ALLOW_LEAD_STATUS_OVERRIDE", "true");
    updatePatchMock.mockReturnValue(jsonResponse({ lead: { ...lead, status: "CONTACTED" }, contacts: [] }));

    renderModal();

    fireEvent.click(screen.getByLabelText(/status/i));
    fireEvent.click(screen.getByRole("option", { name: "Contacted" }));
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() =>
      expect(updatePatchMock).toHaveBeenCalledWith(
        "leads/lead-1",
        expect.objectContaining({
          json: expect.objectContaining({
            status: "CONTACTED",
            allowStatusOverride: true,
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
            allowStatusOverride: false,
          }),
        }),
      ),
    );

    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
