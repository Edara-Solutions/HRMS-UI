import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CreateLeadModal } from "./create-lead-modal";

const createPostMock = vi.hoisted(() => vi.fn());

// `ky` (the apiClient's HTTP layer) constructs AbortSignals that jsdom's fetch
// rejects as cross-realm — stub the client boundary instead of the network.
vi.mock("@/shared/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api")>()),
  apiClient: {
    post: createPostMock,
  },
}));

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
  afterEach(() => {
    cleanup();
    createPostMock.mockReset();
  });

  it("requires a primary contact name before submitting", async () => {
    renderModal();

    fireEvent.click(screen.getByRole("button", { name: /add lead/i }));

    expect(await screen.findByText(/primary contact name is required/i)).toBeInTheDocument();
    expect(createPostMock).not.toHaveBeenCalled();
  });

  it("submits the lead and its primary contact, then closes", async () => {
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
    fireEvent.click(screen.getByRole("button", { name: /add lead/i }));

    await waitFor(() =>
      expect(createPostMock).toHaveBeenCalledWith(
        "leads",
        expect.objectContaining({
          json: expect.objectContaining({
            companyName: "Acme Corp",
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
