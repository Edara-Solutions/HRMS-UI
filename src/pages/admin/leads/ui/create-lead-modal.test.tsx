import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CreateLeadModal } from "./create-lead-modal";

const createPostMock = vi.hoisted(() => vi.fn());
const geoMocks = vi.hoisted(() => ({
  GetCountries: vi.fn(),
  GetState: vi.fn(),
}));

// The apiClient boundary is stubbed instead of the network.
vi.mock("@/shared/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api")>()),
  apiClient: {
    post: createPostMock,
  },
}));

vi.mock("react-country-state-city/dist/cjs/index.js", () => geoMocks);

function jsonResponse<T>(value: T) {
  return { json: () => Promise.resolve(value) };
}

function renderModal(onClose = vi.fn()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <CreateLeadModal open onClose={onClose} />
    </QueryClientProvider>,
  );
}

describe("CreateLeadModal", () => {
  beforeEach(() => {
    geoMocks.GetCountries.mockResolvedValue([
      { id: 65, name: "Egypt", emoji: "EG" },
      { id: 233, name: "United States", emoji: "US" },
    ]);
    geoMocks.GetState.mockResolvedValue([
      { id: 3235, name: "Cairo Governorate" },
      { id: 3236, name: "Alexandria Governorate" },
    ]);
  });

  afterEach(() => {
    cleanup();
    createPostMock.mockReset();
    geoMocks.GetCountries.mockReset();
    geoMocks.GetState.mockReset();
  });

  it("requires a primary contact name before submitting", async () => {
    renderModal();

    fireEvent.click(screen.getByRole("button", { name: /add lead/i }));

    expect(await screen.findByText(/primary contact name is required/i)).toBeInTheDocument();
    expect(createPostMock).not.toHaveBeenCalled();
  });

  it("filters country and state options by search text", async () => {
    renderModal();

    await waitFor(() => expect(screen.getByLabelText(/^country$/i)).not.toBeDisabled());

    fireEvent.click(screen.getByLabelText(/^country$/i));
    fireEvent.change(screen.getByLabelText(/search countries/i), { target: { value: "egy" } });

    expect(await screen.findByRole("option", { name: /Egypt/ })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /United States/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("option", { name: /Egypt/ }));

    await waitFor(() => expect(geoMocks.GetState).toHaveBeenCalledWith(65));
    fireEvent.click(screen.getByLabelText(/^state$/i));
    fireEvent.change(screen.getByLabelText(/search states/i), { target: { value: "alex" } });

    expect(
      await screen.findByRole("option", { name: "Alexandria Governorate" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Cairo Governorate" })).not.toBeInTheDocument();
  });

  it("loads state options from the selected country", async () => {
    renderModal();

    await waitFor(() => expect(screen.getByLabelText(/^country$/i)).not.toBeDisabled());

    fireEvent.click(screen.getByLabelText(/^country$/i));
    fireEvent.click(await screen.findByRole("option", { name: /Egypt/ }));

    await waitFor(() => expect(geoMocks.GetState).toHaveBeenCalledWith(65));
    fireEvent.click(screen.getByLabelText(/^state$/i));
    fireEvent.click(await screen.findByRole("option", { name: "Cairo Governorate" }));

    expect(screen.getByLabelText(/^country$/i)).toHaveTextContent("Egypt");
    expect(screen.getByLabelText(/^state$/i)).toHaveTextContent("Cairo Governorate");
  });

  it("submits the selected state as city, then closes", async () => {
    const onClose = vi.fn();
    createPostMock.mockReturnValue(
      jsonResponse({
        lead: { publicId: "lead-1" },
        contacts: [],
      }),
    );

    renderModal(onClose);

    fireEvent.change(screen.getByLabelText(/company name/i), { target: { value: "Acme Corp" } });
    fireEvent.change(screen.getByLabelText(/^name$/i), { target: { value: "Sara Youssef" } });

    await waitFor(() => expect(screen.getByLabelText(/^country$/i)).not.toBeDisabled());
    fireEvent.click(screen.getByLabelText(/^country$/i));
    fireEvent.click(await screen.findByRole("option", { name: /Egypt/ }));
    await waitFor(() => expect(geoMocks.GetState).toHaveBeenCalledWith(65));
    fireEvent.click(screen.getByLabelText(/^state$/i));
    fireEvent.click(await screen.findByRole("option", { name: "Cairo Governorate" }));

    fireEvent.click(screen.getByRole("button", { name: /add lead/i }));

    await waitFor(() =>
      expect(createPostMock).toHaveBeenCalledWith(
        "leads",
        expect.objectContaining({
          json: expect.objectContaining({
            companyName: "Acme Corp",
            country: "Egypt",
            city: "Cairo Governorate",
            status: "NEW",
            primaryContact: expect.objectContaining({
              name: "Sara Youssef",
              isPrimary: true,
            }),
          }),
        }),
      ),
    );

    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
