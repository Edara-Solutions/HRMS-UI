import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DeliveryListResponse, DeliveryRecord } from "../api/email-deliveries";
import { AdminEmailDeliveriesPage } from "./admin-email-deliveries-page";

const API_GET_MOCK = vi.hoisted(() => vi.fn());
const API_POST_MOCK = vi.hoisted(() => vi.fn());
const NAVIGATE_MOCK = vi.hoisted(() => vi.fn());
const SEARCH_STATE = vi.hoisted(() => ({
  companyPublicId: undefined,
  context: undefined,
  emailTypeKey: undefined,
  recipientEmail: undefined,
  status: undefined,
  createdFrom: undefined,
  createdTo: undefined,
  deliveryId: undefined,
  page: 1,
  pageSize: 20,
}));

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return { ...actual, useNavigate: () => NAVIGATE_MOCK, useSearch: () => SEARCH_STATE };
});

vi.mock("@/shared/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api")>()),
  apiClient: { get: API_GET_MOCK, post: API_POST_MOCK },
}));

const FAILED_DELIVERY: DeliveryRecord = {
  publicId: "11111111-1111-1111-1111-111111111111",
  emailTypeKey: "employee-invitation",
  context: "COMPANY",
  locale: "en",
  localeSource: "SYSTEM_FALLBACK",
  localeFallbackApplied: false,
  timeZone: "UTC",
  timeZoneSource: "SYSTEM_FALLBACK",
  timeZoneFallbackApplied: false,
  status: "FAILED",
  isTest: false,
  maskedRecipient: "a***@acme.example",
  senderName: "Acme",
  senderAddress: "people@acme.example",
  templateRevisionKey: "employee-invitation-v1",
  attempts: 3,
  lastFailureKind: "SMTP",
  providerMessageId: null,
  companyId: 1,
  businessReference: "employee:123",
  createdAt: "2026-07-15T10:00:00.000Z",
  sentAt: null,
  timeline: [
    { stage: "ENQUEUED", occurredAt: "2026-07-15T10:00:00.000Z" },
    {
      stage: "FAILED",
      occurredAt: "2026-07-15T10:01:00.000Z",
      attemptNumber: 3,
      failureKind: "SMTP",
    },
  ],
};

const DELIVERY_LIST: DeliveryListResponse = {
  items: [FAILED_DELIVERY],
  meta: { mode: "page", page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
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
      <AdminEmailDeliveriesPage />
    </QueryClientProvider>,
  );
}

function renderPageWithRetriesEnabled() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: 2, retryDelay: 0 }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AdminEmailDeliveriesPage />
    </QueryClientProvider>,
  );
}

describe("AdminEmailDeliveriesPage", () => {
  afterEach(() => {
    cleanup();
    API_GET_MOCK.mockReset();
    API_POST_MOCK.mockReset();
    NAVIGATE_MOCK.mockReset();
    Object.assign(SEARCH_STATE, {
      companyPublicId: undefined,
      context: undefined,
      emailTypeKey: undefined,
      recipientEmail: undefined,
      status: undefined,
      createdFrom: undefined,
      createdTo: undefined,
      deliveryId: undefined,
      page: 1,
      pageSize: 20,
    });
  });

  it("restores URL-owned context filtering and renders an accessible delivery status", async () => {
    Object.assign(SEARCH_STATE, { context: "COMPANY" });
    API_GET_MOCK.mockReturnValue(jsonResponse(DELIVERY_LIST));
    renderPage();

    expect((await screen.findAllByText("Failed")).length).toBeGreaterThan(0);
    expect(API_GET_MOCK).toHaveBeenCalledWith(
      "emails/deliveries",
      expect.objectContaining({ searchParams: expect.any(URLSearchParams) }),
    );
    const query = API_GET_MOCK.mock.calls[0]?.[1]?.searchParams as URLSearchParams;
    expect(query.get("context")).toBe("COMPANY");
  });

  it("requires a reason before retrying a failed delivery and posts only the operator reason", async () => {
    Object.assign(SEARCH_STATE, { deliveryId: FAILED_DELIVERY.publicId });
    API_GET_MOCK.mockImplementation((path: string) => {
      if (path === "emails/deliveries") return jsonResponse(DELIVERY_LIST);
      if (path === `emails/deliveries/${FAILED_DELIVERY.publicId}`)
        return jsonResponse(FAILED_DELIVERY);
      throw new Error(`Unexpected request: ${path}`);
    });
    API_POST_MOCK.mockReturnValue(jsonResponse({ ...FAILED_DELIVERY, status: "QUEUED" }));
    renderPage();

    expect(await screen.findByRole("button", { name: "Retry delivery" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry delivery" }));
    const confirmation = screen.getAllByRole("button", { name: "Retry delivery" }).at(-1);
    expect(confirmation).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Operator reason"), {
      target: { value: "SMTP access restored" },
    });
    fireEvent.click(confirmation as HTMLElement);

    expect(await screen.findByText("Attempt timeline")).toBeInTheDocument();
    expect(API_POST_MOCK).toHaveBeenCalledWith(
      `emails/deliveries/${FAILED_DELIVERY.publicId}/retry`,
      { json: { reason: "SMTP access restored" } },
    );
    expect(screen.queryByText(/SMTP access restored/)).not.toBeInTheDocument();
  });

  it("does not automatically retry a failed delivery-history request", async () => {
    let deliveryRequestCount = 0;
    API_GET_MOCK.mockImplementation((path: string) => {
      if (path === "emails/deliveries") {
        deliveryRequestCount += 1;
        return { json: () => Promise.reject(new Error("Delivery service unavailable")) };
      }
      if (path === "companies") return jsonResponse({ data: [] });
      if (path === "email-types") return jsonResponse({ items: [] });
      throw new Error(`Unexpected request: ${path}`);
    });
    renderPageWithRetriesEnabled();

    expect(await screen.findByText("Delivery history unavailable")).toBeInTheDocument();
    await waitFor(() => expect(deliveryRequestCount).toBe(1));
  });

  it("clears the date and time draft without closing the picker", async () => {
    API_GET_MOCK.mockImplementation((path: string) => {
      if (path === "emails/deliveries") return jsonResponse(DELIVERY_LIST);
      if (path === "companies") return jsonResponse({ data: [] });
      if (path === "email-types") return jsonResponse({ items: [] });
      throw new Error(`Unexpected request: ${path}`);
    });
    renderPage();

    fireEvent.click(await screen.findByLabelText("Created from"));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText("Minute")).toHaveValue("");
    expect(screen.getByLabelText("Hour")).not.toHaveTextContent(/\d/);
    expect(screen.getByLabelText("AM / PM")).not.toHaveTextContent(/AM|PM/);
  });
});
