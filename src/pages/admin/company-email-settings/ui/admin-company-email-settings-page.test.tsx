import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminCompanyEmailSettingsPage } from "./admin-company-email-settings-page";

const navigateMock = vi.hoisted(() => vi.fn());
const apiDeleteMock = vi.hoisted(() => vi.fn());
const apiGetMock = vi.hoisted(() => vi.fn());
const apiPostMock = vi.hoisted(() => vi.fn());

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useParams: () => ({ publicId: "company-1" }),
  };
});

vi.mock("@/shared/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api")>()),
  apiClient: {
    delete: apiDeleteMock,
    get: apiGetMock,
    post: apiPostMock,
  },
}));

function jsonResponse<T>(value: T) {
  return { json: () => Promise.resolve(value) };
}

type EmailLocale = "en" | "ar";

function mockApi(
  templateRevisionKey?: string,
  supportedLocales: EmailLocale[] = ["en", "ar"],
  companyProfileFails = false,
  previewLocale: EmailLocale = supportedLocales[0] ?? "en",
) {
  apiGetMock.mockImplementation((path: string) => {
    if (path === "email-types") {
      return jsonResponse({
        items: [
          {
            key: "employee-invitation",
            description: "Invite an employee to a Company.",
            context: "COMPANY",
            payloadVersion: 1,
            supportedLocales,
            criticality: "CRITICAL",
            defaultTemplateKey: "company-employee-invitation-v1",
          },
        ],
      });
    }

    if (path === "companies/company-1/email-template-assignments") {
      return jsonResponse({
        items: templateRevisionKey
          ? [
              {
                companyId: 1,
                emailTypeKey: "employee-invitation",
                templateRevisionKey,
                assignedBy: 7,
              },
            ]
          : [],
      });
    }

    if (path === "companies/company-1") {
      if (companyProfileFails)
        return { json: () => Promise.reject(new Error("Company unavailable")) };

      return jsonResponse({
        publicId: "company-1",
        logo: "https://nexus.example/logo.svg",
        name: "Nexus Technologies",
        website: "https://nexus.example",
        phoneNumber: "+966112345678",
        country: "Saudi Arabia",
        companyCode: "NEXUS",
        isActive: true,
        addressLine: "King Fahd Road",
        createdAt: "2026-05-20T10:00:00.000Z",
        updatedAt: "2026-05-20T10:00:00.000Z",
        deletedAt: null,
      });
    }

    if (path === "email-types/employee-invitation/variants") {
      return jsonResponse({
        items: [
          {
            key: "company-employee-invitation-custom-v1",
            emailTypeKey: "employee-invitation",
            context: "COMPANY",
            payloadVersion: 1,
            supportedLocales,
          },
        ],
      });
    }

    if (path === "companies/company-1/email-template-assignments/employee-invitation/effective") {
      return jsonResponse({
        emailTypeKey: "employee-invitation",
        templateKey: templateRevisionKey ?? "company-employee-invitation-v1",
        context: "COMPANY",
        payloadVersion: 1,
        supportedLocales,
        deprecated: false,
      });
    }

    if (path === "email-types/employee-invitation/preview") {
      return jsonResponse({
        emailTypeKey: "employee-invitation",
        templateKey: templateRevisionKey ?? "company-employee-invitation-v1",
        context: "COMPANY",
        locale: previewLocale,
        subject: "Welcome",
        preheader: "Your invitation",
        html: "<p>Company invitation</p>",
        text: "Company invitation",
        senderIdentity: {
          name: "Nexus Technologies",
          address: "people@nexus.example",
          replyTo: "support@nexus.example",
        },
      });
    }

    throw new Error(`Unexpected path: ${path}`);
  });
  apiPostMock.mockReturnValue(
    jsonResponse({
      publicId: "3cd209c2-e6d4-49c9-92f1-9f9e58e20f13",
      status: "QUEUED",
      emailTypeKey: "employee-invitation",
      context: "COMPANY",
      locale: previewLocale,
      isTest: true,
    }),
  );
  apiDeleteMock.mockResolvedValue(undefined);
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AdminCompanyEmailSettingsPage />
    </QueryClientProvider>,
  );
}

describe("AdminCompanyEmailSettingsPage", () => {
  afterEach(() => {
    cleanup();
    apiDeleteMock.mockReset();
    apiGetMock.mockReset();
    apiPostMock.mockReset();
    navigateMock.mockReset();
  });

  it("shows the Company Default Template with its Company sender and no SMTP details", async () => {
    mockApi();
    renderPage();

    expect(await screen.findByText("Company Default Template")).toBeInTheDocument();
    expect(screen.getByText(/Nexus Technologies <people@nexus.example>/)).toBeInTheDocument();
    expect(screen.getByText("support@nexus.example")).toBeInTheDocument();
    expect(screen.getByText("Nexus Technologies")).toBeInTheDocument();
    expect(screen.queryByText(/smtp host|smtp password/i)).not.toBeInTheDocument();
    expect(screen.getByTitle("Company email preview")).toHaveAttribute("sandbox", "");
    await waitFor(() =>
      expect(apiGetMock).toHaveBeenCalledWith(
        "email-types/employee-invitation/preview",
        expect.objectContaining({ searchParams: { companyPublicId: "company-1", locale: "en" } }),
      ),
    );
  });

  it("distinguishes an explicit Company Template Assignment", async () => {
    mockApi("company-employee-invitation-custom-v1");
    renderPage();

    expect(await screen.findByText("Company Template Assignment")).toBeInTheDocument();
    expect(screen.getAllByText("company-employee-invitation-custom-v1").length).toBeGreaterThan(0);
  });

  it("queues a Company-scoped test email", async () => {
    mockApi();
    renderPage();
    await screen.findByText("Company Default Template");

    fireEvent.change(screen.getByLabelText("Recipient email"), {
      target: { value: "operator@nexus.example" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Queue test" }));

    await waitFor(() =>
      expect(apiPostMock).toHaveBeenCalledWith(
        "emails/test-send",
        expect.objectContaining({
          json: {
            companyPublicId: "company-1",
            emailTypeKey: "employee-invitation",
            locale: "en",
            recipientEmail: "operator@nexus.example",
          },
        }),
      ),
    );
  });

  it("uses the only locale supported by the selected Company email type", async () => {
    mockApi(undefined, ["ar"]);
    renderPage();

    await screen.findByText("Company Default Template");
    await waitFor(() =>
      expect(apiGetMock).toHaveBeenCalledWith(
        "email-types/employee-invitation/preview",
        expect.objectContaining({ searchParams: { companyPublicId: "company-1", locale: "ar" } }),
      ),
    );

    fireEvent.change(screen.getByLabelText("Recipient email"), {
      target: { value: "operator@nexus.example" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Queue test" }));

    await waitFor(() =>
      expect(apiPostMock).toHaveBeenCalledWith(
        "emails/test-send",
        expect.objectContaining({
          json: expect.objectContaining({ locale: "ar" }),
        }),
      ),
    );
  });

  it("queues the preview's effective locale when the backend applies a fallback", async () => {
    mockApi(undefined, ["ar"], false, "en");
    renderPage();

    expect((await screen.findAllByText(/Requested locale: Arabic/)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Effective locale: English/).length).toBeGreaterThan(0);
    fireEvent.change(screen.getByLabelText("Recipient email"), {
      target: { value: "operator@nexus.example" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Queue test" }));

    await waitFor(() =>
      expect(apiPostMock).toHaveBeenCalledWith(
        "emails/test-send",
        expect.objectContaining({ json: expect.objectContaining({ locale: "en" }) }),
      ),
    );
  });

  it("does not request a preview when the selected email type has no supported locale", async () => {
    mockApi(undefined, []);
    renderPage();

    expect(await screen.findByText("Company email settings are unavailable")).toBeInTheDocument();
    expect(apiGetMock).not.toHaveBeenCalledWith(
      "email-types/employee-invitation/preview",
      expect.anything(),
    );
  });

  it("does not render email controls when the Company profile cannot be loaded", async () => {
    mockApi(undefined, ["en", "ar"], true);
    renderPage();

    expect(await screen.findByText("Company email settings are unavailable")).toBeInTheDocument();
    expect(screen.queryByLabelText("Company email type")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("validates the test recipient before queueing", async () => {
    mockApi();
    renderPage();
    await screen.findByText("Company Default Template");

    fireEvent.change(screen.getByLabelText("Recipient email"), {
      target: { value: "not-an-email" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Queue test" }));

    expect(await screen.findByText("Enter a valid recipient email address")).toBeInTheDocument();
    expect(apiPostMock).not.toHaveBeenCalled();
  });

  it("confirms before assigning an eligible variant", async () => {
    mockApi();
    renderPage();
    await screen.findByText("Company Default Template");

    fireEvent.click(screen.getByLabelText("Eligible Template Variant"));
    fireEvent.click(
      await screen.findByRole("option", { name: "company-employee-invitation-custom-v1" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Assign variant" }));
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Assign variant" }),
    );

    await waitFor(() =>
      expect(apiPostMock).toHaveBeenCalledWith(
        "companies/company-1/email-template-assignments",
        expect.objectContaining({
          json: {
            emailTypeKey: "employee-invitation",
            templateRevisionKey: "company-employee-invitation-custom-v1",
          },
        }),
      ),
    );
  });

  it("confirms before removing the explicit assignment", async () => {
    mockApi("company-employee-invitation-custom-v1");
    renderPage();
    await screen.findByText("Company Template Assignment");

    fireEvent.click(screen.getByRole("button", { name: "Remove assignment" }));
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Remove assignment" }),
    );

    await waitFor(() =>
      expect(apiDeleteMock).toHaveBeenCalledWith(
        "companies/company-1/email-template-assignments/employee-invitation",
      ),
    );
  });
});
