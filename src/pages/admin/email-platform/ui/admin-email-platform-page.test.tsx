import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { usePreferencesStore } from "@/shared/config";
import type { EmailPreview, EmailTypeListResponse } from "../api/email-platform";
import { AdminEmailPlatformPage } from "./admin-email-platform-page";

const API_GET_MOCK = vi.hoisted(() => vi.fn());
const NAVIGATE_MOCK = vi.hoisted(() => vi.fn());
const SEARCH_STATE = vi.hoisted(() => ({
  context: "ALL",
  emailTypeKey: undefined,
  locale: "en",
  view: "html",
}));

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    useNavigate: () => NAVIGATE_MOCK,
    useSearch: () => SEARCH_STATE,
  };
});

vi.mock("@/shared/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api")>()),
  apiClient: {
    get: API_GET_MOCK,
  },
}));

const EMAIL_TYPES: EmailTypeListResponse = {
  items: [
    {
      key: "company-digest",
      description: "Summarize Company activity.",
      context: "COMPANY",
      payloadVersion: 1,
      supportedLocales: ["en"],
      criticality: "OPERATIONAL",
      defaultTemplateKey: "company-digest-v1",
    },
    {
      key: "employee-invitation",
      description: "Invite an employee in the Company's voice.",
      context: "COMPANY",
      payloadVersion: 1,
      supportedLocales: ["en", "ar"],
      criticality: "OPERATIONAL",
      defaultTemplateKey: "company-employee-invitation-v1",
    },
    {
      key: "owner-invitation",
      description: "Invite the initial Company Owner.",
      context: "EDARA",
      payloadVersion: 1,
      supportedLocales: ["en", "ar"],
      criticality: "CRITICAL",
      defaultTemplateKey: "edara-owner-invitation-v1",
    },
  ],
};

const OWNER_PREVIEW: EmailPreview = {
  emailTypeKey: "owner-invitation",
  templateKey: "edara-owner-invitation-v1",
  context: "EDARA",
  locale: "en",
  subject: "You are invited to set up your Company on Edara",
  preheader: "Your safe sample invitation is ready.",
  html: "<html><body><h1>Welcome to Edara</h1></body></html>",
  text: "Welcome to Edara",
};

const COMPANY_PREVIEW: EmailPreview = {
  emailTypeKey: "employee-invitation",
  templateKey: "company-employee-invitation-v1",
  context: "COMPANY",
  locale: "ar",
  subject: "دعوة للانضمام إلى شركة النور",
  preheader: "دعوة تجريبية آمنة.",
  html: '<html lang="ar" dir="rtl"><body><h1>شركة النور</h1></body></html>',
  text: "شركة النور",
  senderIdentity: {
    name: "شركة النور",
    address: "people@alnoor.example",
    replyTo: "hr@alnoor.example",
  },
};

function jsonResponse<T>(value: T) {
  return { json: () => Promise.resolve(value) };
}

function mockCatalogAndPreview(preview: EmailPreview = OWNER_PREVIEW) {
  API_GET_MOCK.mockImplementation((path: string) => {
    if (path === "email-types") return jsonResponse(EMAIL_TYPES);
    if (path === `email-types/${preview.emailTypeKey}/preview`) {
      return jsonResponse(preview);
    }
    throw new Error(`Unexpected path: ${path}`);
  });
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AdminEmailPlatformPage />
    </QueryClientProvider>,
  );
}

describe("AdminEmailPlatformPage", () => {
  afterEach(() => {
    cleanup();
    API_GET_MOCK.mockReset();
    NAVIGATE_MOCK.mockReset();
    usePreferencesStore.getState().setLocale("en");
    Object.assign(SEARCH_STATE, {
      context: "ALL",
      emailTypeKey: undefined,
      locale: "en",
      view: "html",
    });
  });

  it("shows immutable Edara and Company catalog contexts and previews the Owner Invitation", async () => {
    mockCatalogAndPreview();
    renderPage();

    expect(await screen.findByRole("heading", { name: "Owner Invitation" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Employee Invitation" })).toBeInTheDocument();
    expect(screen.getAllByText("Edara Email").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Company Email").length).toBeGreaterThan(0);
    expect(screen.getByText("edara-owner-invitation-v1")).toBeInTheDocument();
    expect(screen.getByText("company-employee-invitation-v1")).toBeInTheDocument();
    expect(screen.getAllByText("en").length).toBeGreaterThan(0);
    expect(screen.getAllByText("ar").length).toBeGreaterThan(0);

    const frame = await screen.findByTitle("Owner Invitation email preview");
    expect(frame).toHaveAttribute("sandbox", "");
    expect(frame).toHaveAttribute("srcdoc", OWNER_PREVIEW.html);
  });

  it("renders the Company default preview with only its resolved white-label identity", async () => {
    Object.assign(SEARCH_STATE, {
      emailTypeKey: "employee-invitation",
      locale: "ar",
    });
    mockCatalogAndPreview(COMPANY_PREVIEW);
    renderPage();

    const frame = await screen.findByTitle("Employee Invitation email preview");
    const source = frame.getAttribute("srcdoc") ?? "";
    expect(source).toContain("شركة النور");
    expect(source.toLowerCase()).not.toContain("edara");
    expect(screen.getByText("people@alnoor.example")).toBeInTheDocument();
    expect(screen.getByText(/hr@alnoor\.example/)).toBeInTheDocument();
  });

  it("selects the required Company Employee Invitation when no key is supplied", async () => {
    Object.assign(SEARCH_STATE, { context: "COMPANY", locale: "ar" });
    mockCatalogAndPreview(COMPANY_PREVIEW);
    renderPage();

    expect(await screen.findByTitle("Employee Invitation email preview")).toHaveAttribute(
      "srcdoc",
      COMPANY_PREVIEW.html,
    );
    expect(API_GET_MOCK).not.toHaveBeenCalledWith(
      "email-types/company-digest/preview",
      expect.anything(),
    );
  });

  it("renders page, controls, and Email Type names in Arabic", async () => {
    usePreferencesStore.getState().setLocale("ar");
    mockCatalogAndPreview();
    renderPage();

    expect(await screen.findByRole("heading", { name: "البريد" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "سياق الكتالوج" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "دعوة مالك الشركة" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /معاينة دعوة مالك الشركة/ })).toBeInTheDocument();
  });

  it("blocks every identity-bearing Company preview field when Edara branding leaks", async () => {
    Object.assign(SEARCH_STATE, { emailTypeKey: "employee-invitation" });
    const unsafeCompanyPreview: EmailPreview = {
      ...COMPANY_PREVIEW,
      locale: "en",
      subject: "An Edara invitation",
      preheader: "Edara support",
      html: '<img src="https://assets.example/edara-logo.svg" alt="Edara" />',
      text: "Contact support@edara.example",
      senderIdentity: {
        name: "Edara",
        address: "mail@edara.example",
        replyTo: "support@edara.example",
      },
    };
    mockCatalogAndPreview(unsafeCompanyPreview);
    renderPage();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Company preview blocked");
    expect(screen.queryByTitle("Employee Invitation email preview")).not.toBeInTheDocument();
    expect(screen.queryByText("mail@edara.example")).not.toBeInTheDocument();
  });

  it("shows an actionable error instead of silently replacing an invalid shared selection", async () => {
    Object.assign(SEARCH_STATE, { emailTypeKey: "removed-email-type" });
    API_GET_MOCK.mockImplementation((path: string) => {
      if (path === "email-types") return jsonResponse(EMAIL_TYPES);
      throw new Error(`Unexpected path: ${path}`);
    });
    renderPage();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Email Type unavailable");
    expect(screen.queryByTitle(/email preview/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Choose default preview" }));
    const nextSearch = NAVIGATE_MOCK.mock.calls.at(-1)?.[0].search;
    expect(nextSearch(SEARCH_STATE)).toEqual(expect.objectContaining({ emailTypeKey: undefined }));
  });

  it("shows an actionable error when a required default is missing from the registry", async () => {
    API_GET_MOCK.mockImplementation((path: string) => {
      if (path === "email-types") return jsonResponse({ items: [EMAIL_TYPES.items[0]] });
      throw new Error(`Unexpected path: ${path}`);
    });
    renderPage();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("required default Email Type is not registered");
    expect(screen.queryByTitle(/email preview/)).not.toBeInTheDocument();
  });

  it("disables unsupported locales without requesting an invalid preview", async () => {
    Object.assign(SEARCH_STATE, {
      context: "COMPANY",
      emailTypeKey: "company-digest",
      locale: "ar",
    });
    API_GET_MOCK.mockImplementation((path: string) => {
      if (path === "email-types") return jsonResponse(EMAIL_TYPES);
      throw new Error(`Unexpected path: ${path}`);
    });
    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent("Preview locale unavailable");
    expect(screen.getByRole("button", { name: "Arabic preview" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "English preview" })).toBeEnabled();
    expect(API_GET_MOCK).toHaveBeenCalledTimes(1);
  });

  it("shows an actionable preview error without leaking backend details", async () => {
    API_GET_MOCK.mockImplementation((path: string) => {
      if (path === "email-types") return jsonResponse(EMAIL_TYPES);
      if (path === "email-types/owner-invitation/preview") {
        return { json: () => Promise.reject(new Error("SMTP_SECRET=do-not-leak")) };
      }
      throw new Error(`Unexpected path: ${path}`);
    });
    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent("Preview unavailable");
    expect(screen.getByRole("alert")).toHaveTextContent("Try another locale or retry shortly");
    expect(screen.queryByText(/SMTP_SECRET/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry preview" })).toBeInTheDocument();
  });

  it("rejects a successful preview response that does not match the requested context", async () => {
    Object.assign(SEARCH_STATE, {
      context: "COMPANY",
      emailTypeKey: "employee-invitation",
      locale: "ar",
    });
    API_GET_MOCK.mockImplementation((path: string) => {
      if (path === "email-types") return jsonResponse(EMAIL_TYPES);
      if (path === "email-types/employee-invitation/preview") {
        return jsonResponse({ ...COMPANY_PREVIEW, context: "EDARA" });
      }
      throw new Error(`Unexpected path: ${path}`);
    });
    renderPage();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Preview unavailable");
    expect(alert).not.toHaveTextContent("Invalid email preview response");
    expect(screen.queryByTitle("Employee Invitation email preview")).not.toBeInTheDocument();
  });

  it("keeps test-send disabled until the backend can durably queue a message", async () => {
    mockCatalogAndPreview();
    renderPage();

    const testSend = await screen.findByRole("button", { name: "Queue test email" });
    expect(testSend).toBeDisabled();
    expect(screen.getByText("Test delivery queue unavailable")).toBeInTheDocument();
    expect(screen.getByLabelText("Test recipient")).toBeDisabled();
  });

  it("writes context, locale, and preview-view controls to URL search state", async () => {
    mockCatalogAndPreview();
    renderPage();
    await screen.findByRole("heading", { name: "Owner Invitation" });

    fireEvent.click(screen.getByRole("button", { name: "Company context" }));
    fireEvent.click(screen.getByRole("button", { name: "Arabic preview" }));
    fireEvent.click(screen.getByRole("button", { name: "Plain text preview" }));

    const contextSearch = NAVIGATE_MOCK.mock.calls[0]?.[0].search;
    const localeSearch = NAVIGATE_MOCK.mock.calls[1]?.[0].search;
    const viewSearch = NAVIGATE_MOCK.mock.calls[2]?.[0].search;
    expect(contextSearch(SEARCH_STATE)).toEqual(
      expect.objectContaining({ context: "COMPANY", emailTypeKey: undefined }),
    );
    expect(localeSearch(SEARCH_STATE)).toEqual(expect.objectContaining({ locale: "ar" }));
    expect(viewSearch(SEARCH_STATE)).toEqual(expect.objectContaining({ view: "text" }));
  });

  it("shows a stable catalog loading state", () => {
    API_GET_MOCK.mockReturnValue({ json: () => new Promise(() => {}) });
    renderPage();

    expect(screen.getByRole("status", { name: "Loading Email Type catalog" })).toBeInTheDocument();
  });

  it("shows a stable preview loading state after the catalog resolves", async () => {
    API_GET_MOCK.mockImplementation((path: string) => {
      if (path === "email-types") return jsonResponse(EMAIL_TYPES);
      if (path === "email-types/owner-invitation/preview") {
        return { json: () => new Promise(() => {}) };
      }
      throw new Error(`Unexpected path: ${path}`);
    });
    renderPage();

    expect(
      await screen.findByRole("status", { name: "Loading email preview" }),
    ).toBeInTheDocument();
  });

  it("shows an explicit empty state when no Email Types are registered", async () => {
    API_GET_MOCK.mockImplementation((path: string) => {
      if (path === "email-types") return jsonResponse({ items: [] });
      throw new Error(`Unexpected path: ${path}`);
    });
    renderPage();

    expect(await screen.findByText("No Email Types found")).toBeInTheDocument();
    expect(screen.getByText("No registered templates match this context.")).toBeInTheDocument();
  });

  it("shows a secret-safe catalog error and a retry action", async () => {
    API_GET_MOCK.mockReturnValue({
      json: () => Promise.reject(new Error("DATABASE_URL=do-not-leak")),
    });
    renderPage();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Catalog unavailable");
    expect(alert).not.toHaveTextContent("DATABASE_URL");
    expect(screen.getByRole("button", { name: "Retry catalog" })).toBeInTheDocument();
  });
});
