import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LogActivityForm } from "./log-activity-form";

const postMock = vi.hoisted(() => vi.fn());

// `ky` (the apiClient's HTTP layer) constructs AbortSignals that jsdom's fetch
// rejects as cross-realm — stub the client boundary instead of the network.
vi.mock("@/shared/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api")>()),
  apiClient: {
    post: postMock,
  },
}));

function jsonResponse<T>(value: T) {
  return { json: () => Promise.resolve(value) };
}

function renderForm() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <LogActivityForm leadPublicId="lead-1" />
    </QueryClientProvider>,
  );
}

describe("LogActivityForm", () => {
  afterEach(() => {
    cleanup();
    postMock.mockReset();
  });

  it("requires a note before logging", async () => {
    renderForm();

    fireEvent.click(screen.getByRole("button", { name: /log activity/i }));

    expect(await screen.findByText(/note is required/i)).toBeInTheDocument();
    expect(postMock).not.toHaveBeenCalled();
  });

  it("logs the activity and clears the note", async () => {
    postMock.mockReturnValue(
      jsonResponse({ publicId: "activity-1", type: "MEETING", note: "Kickoff call" }),
    );

    renderForm();

    fireEvent.click(screen.getByLabelText(/type/i));
    fireEvent.click(screen.getByRole("option", { name: "Meeting" }));
    fireEvent.change(screen.getByLabelText(/note/i), { target: { value: "Kickoff call" } });
    fireEvent.click(screen.getByRole("button", { name: /log activity/i }));

    await waitFor(() =>
      expect(postMock).toHaveBeenCalledWith(
        "leads/lead-1/activities",
        expect.objectContaining({ json: { type: "MEETING", note: "Kickoff call" } }),
      ),
    );

    await waitFor(() => expect(screen.getByLabelText(/note/i)).toHaveValue(""));
  });
});

