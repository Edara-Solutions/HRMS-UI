import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { LeadContact } from "../api/lead-detail";
import type { LeadContactModalState } from "./lead-contact-form-modal";
import { LeadContactFormModal } from "./lead-contact-form-modal";

const postMock = vi.hoisted(() => vi.fn());
const patchMock = vi.hoisted(() => vi.fn());

// `ky` (the apiClient's HTTP layer) constructs AbortSignals that jsdom's fetch
// rejects as cross-realm — stub the client boundary instead of the network.
vi.mock("@/shared/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api")>()),
  apiClient: {
    post: postMock,
    patch: patchMock,
  },
}));

function jsonResponse<T>(value: T) {
  return { json: () => Promise.resolve(value) };
}

const contact: LeadContact = {
  publicId: "contact-1",
  name: "Sara Youssef",
  email: "sara@acme.example.com",
  phone: "0100000000",
  jobTitle: "COO",
  isPrimary: false,
};

function renderModal(state: LeadContactModalState, onClose = vi.fn()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <LeadContactFormModal leadPublicId="lead-1" state={state} onClose={onClose} />
    </QueryClientProvider>,
  );
}

describe("LeadContactFormModal", () => {
  afterEach(() => {
    cleanup();
    postMock.mockReset();
    patchMock.mockReset();
  });

  it("adds a new contact", async () => {
    const onClose = vi.fn();
    postMock.mockReturnValue(jsonResponse({ publicId: "contact-2" }));

    renderModal({ contact: null }, onClose);

    fireEvent.change(screen.getByLabelText(/^name$/i), { target: { value: "Ahmad Al-Ghamdi" } });
    fireEvent.click(screen.getByRole("button", { name: /add contact/i }));

    await waitFor(() =>
      expect(postMock).toHaveBeenCalledWith(
        "leads/lead-1/contacts",
        expect.objectContaining({ json: expect.objectContaining({ name: "Ahmad Al-Ghamdi" }) }),
      ),
    );
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("pre-fills and edits an existing contact", async () => {
    const onClose = vi.fn();
    patchMock.mockReturnValue(jsonResponse({ ...contact, jobTitle: "CEO" }));

    renderModal({ contact }, onClose);

    expect(screen.getByLabelText(/^name$/i)).toHaveValue("Sara Youssef");

    fireEvent.change(screen.getByLabelText(/job title/i), { target: { value: "CEO" } });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() =>
      expect(patchMock).toHaveBeenCalledWith(
        "leads/lead-1/contacts/contact-1",
        expect.objectContaining({ json: expect.objectContaining({ jobTitle: "CEO" }) }),
      ),
    );
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});

