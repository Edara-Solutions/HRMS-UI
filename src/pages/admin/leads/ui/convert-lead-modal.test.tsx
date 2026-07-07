import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { LeadWithContacts } from "../api/leads";
import { ConvertLeadModal } from "./convert-lead-modal";

const convertPostMock = vi.hoisted(() => vi.fn());

// `ky` (the apiClient's HTTP layer) constructs AbortSignals that jsdom's fetch
// rejects as cross-realm — stub the client boundary instead of the network.
vi.mock("@/shared/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api")>()),
  apiClient: {
    post: convertPostMock,
  },
}));

function jsonResponse<T>(value: T) {
  return { json: () => Promise.resolve(value) };
}

async function rejectedWith(status: number, body: unknown) {
  const { HTTPError } = await import("ky");
  return {
    json: () =>
      Promise.reject(
        new HTTPError(
          new Response(JSON.stringify(body), { status }),
          new Request("http://localhost/leads/lead-1/convert"),
          { credentials: "same-origin" } as never,
        ),
      ),
  };
}

const leadWithContacts: LeadWithContacts = {
  lead: {
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
    ownerUserId: null,
    numberOfAttempts: 0,
    companyId: null,
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
    deletedAt: null,
  },
  contacts: [
    {
      publicId: "contact-1",
      name: "Ahmad Al-Ghamdi",
      email: "ahmad@acme.com",
      phone: "0100000000",
      jobTitle: "CEO",
      isPrimary: true,
    },
  ],
};

function renderModal(onClose = vi.fn(), onConverted = vi.fn()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ConvertLeadModal
        leadWithContacts={leadWithContacts}
        onClose={onClose}
        onConverted={onConverted}
      />
    </QueryClientProvider>,
  );
}

describe("ConvertLeadModal", () => {
  afterEach(() => {
    cleanup();
    convertPostMock.mockReset();
  });

  it("pre-fills company and owner fields from the lead and its primary contact", () => {
    renderModal();

    expect(screen.getByLabelText(/company name/i)).toHaveValue("Acme Corp");
    expect(screen.getByLabelText(/country/i)).toHaveValue("Egypt");
    expect(screen.getByLabelText(/^first name$/i)).toHaveValue("Ahmad");
    expect(screen.getByLabelText(/^last name$/i)).toHaveValue("Al-Ghamdi");
    expect(screen.getByLabelText(/^email$/i)).toHaveValue("ahmad@acme.com");
  });

  it("blocks submit with a clear message when the owner email is empty", async () => {
    renderModal();

    fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: "0100000000" } });
    fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: /convert to company/i }));

    expect(await screen.findByText(/owner email is required/i)).toBeInTheDocument();
    expect(convertPostMock).not.toHaveBeenCalled();
  });

  it("submits the company and owner payload to the convert endpoint", async () => {
    convertPostMock.mockReturnValue(
      jsonResponse({ publicId: "company-1", name: "Acme Corp", companyCode: "ACME" }),
    );

    renderModal();

    fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: "0100000000" } });
    fireEvent.click(screen.getByRole("button", { name: /convert to company/i }));

    await waitFor(() =>
      expect(convertPostMock).toHaveBeenCalledWith(
        "leads/lead-1/convert",
        expect.objectContaining({
          json: {
            name: "Acme Corp",
            country: "Egypt",
            phoneNumber: "0100000000",
            ownerFirstName: "Ahmad",
            ownerLastName: "Al-Ghamdi",
            ownerEmail: "ahmad@acme.com",
          },
        }),
      ),
    );

    expect(await screen.findByText(/ACME/)).toBeInTheDocument();
  });

  it("calls onConverted with the new company when View company is clicked", async () => {
    convertPostMock.mockReturnValue(
      jsonResponse({ publicId: "company-1", name: "Acme Corp", companyCode: "ACME" }),
    );
    const onConverted = vi.fn();

    renderModal(vi.fn(), onConverted);

    fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: "0100000000" } });
    fireEvent.click(screen.getByRole("button", { name: /convert to company/i }));

    fireEvent.click(await screen.findByRole("button", { name: /view company/i }));

    expect(onConverted).toHaveBeenCalledWith({
      publicId: "company-1",
      name: "Acme Corp",
      companyCode: "ACME",
    });
  });

  it("surfaces a backend conflict error inline", async () => {
    convertPostMock.mockReturnValue(
      await rejectedWith(409, { error: "A user with this email already exists" }),
    );

    renderModal();

    fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: "0100000000" } });
    fireEvent.click(screen.getByRole("button", { name: /convert to company/i }));

    expect(await screen.findByText(/a user with this email already exists/i)).toBeInTheDocument();
  });
});
