import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { LeadWithContacts } from "../api/lead-detail";
import type { SendingDomainReadiness } from "../api/sending-domain";
import { ConvertLeadModal } from "./convert-lead-modal";

vi.mock("@/shared/ui/country-select", () => ({
  CountrySelect: ({
    id,
    value,
    onValueChange,
    onBlur,
  }: {
    id?: string;
    value: string;
    onValueChange: (value: string) => void;
    onBlur?: () => void;
  }) => (
    <button id={id} type="button" onBlur={onBlur} onClick={() => onValueChange("United States")}>
      {value || "Select country"}
    </button>
  ),
}));

const convertPostMock = vi.hoisted(() => vi.fn());
const readinessGetMock = vi.hoisted(() => vi.fn());

// `ky` (the apiClient's HTTP layer) constructs AbortSignals that jsdom's fetch
// rejects as cross-realm â€” stub the client boundary instead of the network.
vi.mock("@/shared/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api")>()),
  apiClient: {
    post: convertPostMock,
    get: readinessGetMock,
  },
}));

function jsonResponse<T>(value: T) {
  return { json: () => Promise.resolve(value) };
}

async function rejectedWith(status: number, body: unknown) {
  const { HTTPError } = await import("ky");
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
          new Request("http://localhost/leads/lead-1/convert"),
          options,
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
    isConverted: false,
    numberOfAttempts: 0,
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
      createdAt: "2026-06-01T00:00:00.000Z",
      updatedAt: "2026-06-01T00:00:00.000Z",
      deletedAt: null,
    },
  ],
};

function renderModal(
  onClose = vi.fn(),
  onConverted = vi.fn(),
  readiness: SendingDomainReadiness = { ready: true },
) {
  readinessGetMock.mockReturnValue(jsonResponse(readiness));
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
    readinessGetMock.mockReset();
  });

  it("pre-fills company and owner fields from the lead and its primary contact", () => {
    renderModal();

    expect(screen.getByLabelText(/company name/i)).toHaveValue("Acme Corp");
    expect(screen.getByLabelText(/country/i)).toHaveTextContent("Egypt");
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
    expect(screen.getByText(/Edara Owner Invitation was accepted and queued/i)).toBeInTheDocument();
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

  it("revalidates readiness before submitting and blocks stale conversion", async () => {
    renderModal(vi.fn(), vi.fn(), { ready: false, reason: "STALE" });

    fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: "0100000000" } });
    fireEvent.click(screen.getByRole("button", { name: /convert to company/i }));

    expect(
      await screen.findByText(
        /conversion is blocked because the company sending-domain check is stale/i,
      ),
    ).toBeInTheDocument();
    expect(convertPostMock).not.toHaveBeenCalled();
  });

  it("turns a readiness race from the API into an actionable message", async () => {
    convertPostMock.mockReturnValue(
      await rejectedWith(409, { error: "Convert blocked: sending domain is not ready (STALE)" }),
    );
    renderModal();

    fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: "0100000000" } });
    fireEvent.click(screen.getByRole("button", { name: /convert to company/i }));

    expect(
      await screen.findByText(
        /sending-domain readiness changed. refresh the status and try again/i,
      ),
    ).toBeInTheDocument();
  });
});
