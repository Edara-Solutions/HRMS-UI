import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SendingContextStatus, SendingStatusResponse } from "../api/email-sending";
import { AdminEmailSendingPage } from "./admin-email-sending-page";

const API_GET_MOCK = vi.hoisted(() => vi.fn());
const API_POST_MOCK = vi.hoisted(() => vi.fn());

vi.mock("@/shared/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api")>()),
  apiClient: { get: API_GET_MOCK, post: API_POST_MOCK },
}));

function status(overrides: Partial<SendingContextStatus> = {}): SendingContextStatus {
  return {
    context: "EDARA",
    paused: false,
    reason: null,
    updatedBy: null,
    updatedAt: null,
    ...overrides,
  };
}

const BOTH_ACTIVE: SendingStatusResponse = {
  items: [status({ context: "EDARA" }), status({ context: "COMPANY" })],
};

function jsonResponse<T>(value: T) {
  return { json: () => Promise.resolve(value) };
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AdminEmailSendingPage />
    </QueryClientProvider>,
  );
}

describe("AdminEmailSendingPage", () => {
  afterEach(() => {
    cleanup();
    API_GET_MOCK.mockReset();
    API_POST_MOCK.mockReset();
  });

  it("shows both contexts as active when nothing is paused", async () => {
    API_GET_MOCK.mockReturnValue(jsonResponse(BOTH_ACTIVE));
    renderPage();

    expect(await screen.findByText("Edara sending")).toBeInTheDocument();
    expect(screen.getByText("Company sending")).toBeInTheDocument();
    expect(screen.getAllByText("Active")).toHaveLength(2);
    // Both contexts offer a pause action; neither offers resume.
    expect(screen.getAllByRole("button", { name: "Pause sending" })).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "Resume sending" })).not.toBeInTheDocument();
  });

  it("surfaces the pause reason and a resume action for a paused context", async () => {
    API_GET_MOCK.mockReturnValue(
      jsonResponse({
        items: [
          status({
            context: "EDARA",
            paused: true,
            reason: "SMTP provider outage",
            updatedBy: 7,
            updatedAt: "2026-07-17T10:00:00.000Z",
          }),
          status({ context: "COMPANY" }),
        ],
      } satisfies SendingStatusResponse),
    );
    renderPage();

    expect(await screen.findByText("SMTP provider outage")).toBeInTheDocument();
    expect(screen.getByText("Paused")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Resume sending" })).toBeInTheDocument();
  });

  it("requires a reason before it will pause a context", async () => {
    API_GET_MOCK.mockReturnValue(jsonResponse(BOTH_ACTIVE));
    renderPage();

    const pauseButtons = await screen.findAllByRole("button", { name: "Pause sending" });
    fireEvent.click(pauseButtons[0] as HTMLElement);

    // Confirm without typing a reason: the dialog validates and never calls the API.
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    await screen.findByText("A reason is required.");
    expect(API_POST_MOCK).not.toHaveBeenCalled();
  });

  it("pauses a context with the entered reason through the API", async () => {
    API_GET_MOCK.mockReturnValue(jsonResponse(BOTH_ACTIVE));
    API_POST_MOCK.mockReturnValue(
      jsonResponse(status({ context: "EDARA", paused: true, reason: "provider outage" })),
    );
    renderPage();

    const pauseButtons = await screen.findAllByRole("button", { name: "Pause sending" });
    fireEvent.click(pauseButtons[0] as HTMLElement);
    fireEvent.change(screen.getByLabelText("Reason"), {
      target: { value: "provider outage" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));

    await waitFor(() =>
      expect(API_POST_MOCK).toHaveBeenCalledWith("emails/sending/EDARA/pause", {
        json: { reason: "provider outage" },
      }),
    );
  });

  it("resumes a paused context through the API", async () => {
    API_GET_MOCK.mockReturnValue(
      jsonResponse({
        items: [
          status({ context: "EDARA", paused: true, reason: "outage" }),
          status({ context: "COMPANY" }),
        ],
      } satisfies SendingStatusResponse),
    );
    API_POST_MOCK.mockReturnValue(jsonResponse(status({ context: "EDARA", paused: false })));
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Resume sending" }));
    fireEvent.click(screen.getByRole("button", { name: "Resume" }));

    await waitFor(() =>
      expect(API_POST_MOCK).toHaveBeenCalledWith("emails/sending/EDARA/resume", { json: {} }),
    );
  });
});
