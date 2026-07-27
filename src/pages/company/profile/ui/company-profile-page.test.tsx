import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { HTTPError } from "ky";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/shared/auth";
import { buildProfileUpdate, CompanyProfilePage } from "./company-profile-page";

const apiGetMock = vi.hoisted(() => vi.fn());
const apiPatchMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api")>()),
  apiClient: { get: apiGetMock, patch: apiPatchMock },
}));

const PROFILE = {
  publicId: "profile-1",
  companyPublicId: "company-1",
  name: "Northwind Egypt",
  logoUrl: null,
  email: "owner@example.com",
  phone: "+20 100 000 0000",
  country: "EG",
  city: "Cairo",
  addressLine: "12 Nile Street",
  taxNumber: null,
  commercialNumber: null,
  status: "INCOMPLETE",
  createdAt: "2026-07-27T09:00:00.000Z",
  updatedAt: "2026-07-27T09:00:00.000Z",
};

const SETUP = {
  companyPublicId: "company-1",
  templateVersion: 1,
  steps: [
    {
      publicId: "step-1",
      stepType: "SET_COMPANY_PROFILE",
      status: "PENDING",
      isRequired: true,
      sequence: 1,
      templateVersion: 1,
      dependencies: [],
      startedAt: null,
      completedAt: null,
      createdAt: "2026-07-27T09:00:00.000Z",
      updatedAt: "2026-07-27T09:00:00.000Z",
    },
  ],
};

function jsonResponse(value: unknown) {
  return { json: () => Promise.resolve(value) };
}

function errorResponse(status: number, body: unknown) {
  const options: ConstructorParameters<typeof HTTPError>[2] = {
    method: "PATCH",
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
          new Request("http://localhost/companies/company-1/profile"),
          options,
        ),
      ),
  };
}

function setOwnerSession() {
  useAuthStore.setState({
    status: "authenticated",
    session: {
      accessToken: "token",
      refreshToken: "refresh",
      sessionId: "session-1",
      expiresIn: 900,
      user: {
        publicId: "owner-1",
        employeeCode: "OWNER-001",
        firstName: "Nadia",
        lastName: "Hassan",
        email: "owner@example.com",
        status: "ACTIVE",
        companyCode: "NW",
        companyPublicId: "company-1",
        mustChangePassword: false,
        permissions: [],
        isOwner: true,
        isPlatformAdmin: false,
      },
    },
  });
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <CompanyProfilePage />
    </QueryClientProvider>,
  );
}

describe("buildProfileUpdate", () => {
  it("omits untouched fields and sends null for touched nullable clears", () => {
    expect(
      buildProfileUpdate(
        {
          name: "Northwind Egypt",
          logoUrl: "",
          email: "owner@example.com",
          phone: "",
          country: "EG",
          city: "Giza",
          addressLine: "12 Nile Street",
          taxNumber: "",
          commercialNumber: "",
        },
        { phone: true, city: true },
      ),
    ).toEqual({ phone: null, city: "Giza" });
  });
});

describe("CompanyProfilePage", () => {
  beforeEach(() => {
    setOwnerSession();
    apiGetMock.mockImplementation((path: string) => {
      if (path === "companies/company-1/profile") return jsonResponse(PROFILE);
      if (path === "companies/company-1/setup") return jsonResponse(SETUP);
      throw new Error(`Unexpected path: ${path}`);
    });
  });

  afterEach(() => {
    cleanup();
    apiGetMock.mockReset();
    apiPatchMock.mockReset();
    useAuthStore.setState({ session: null, status: "anonymous" });
  });

  it("loads by the authenticated company context and resets to canonical save values", async () => {
    apiPatchMock.mockReturnValue(
      jsonResponse({
        ...PROFILE,
        email: "owner@example.com",
        city: "Giza",
        phone: null,
        status: "COMPLETE",
        updatedAt: "2026-07-27T10:00:00.000Z",
      }),
    );
    renderPage();

    fireEvent.change(await screen.findByLabelText(/^phone$/i), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText(/^city$/i), { target: { value: " Giza " } });
    fireEvent.click(screen.getByRole("button", { name: /save profile/i }));

    await waitFor(() =>
      expect(apiPatchMock).toHaveBeenCalledWith("companies/company-1/profile", {
        json: { phone: null, city: "Giza" },
      }),
    );
    expect(await screen.findByDisplayValue("Giza")).toBeInTheDocument();
    expect(screen.getByLabelText(/^phone$/i)).toHaveValue("");
    expect(
      screen.getByText("Profile saved. Continue with the remaining setup checklist."),
    ).toBeInTheDocument();
  });

  it("maps backend field feedback without discarding the user's draft", async () => {
    apiPatchMock.mockReturnValue(
      errorResponse(422, {
        error: "Profile validation failed.",
        fieldErrors: { email: "Enter a valid company email." },
      }),
    );
    renderPage();

    fireEvent.change(await screen.findByLabelText(/^email$/i), {
      target: { value: "taken@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save profile/i }));

    expect(await screen.findByText("Enter a valid company email.")).toBeInTheDocument();
    expect(screen.getByLabelText(/^email$/i)).toHaveValue("taken@example.com");
  });
});
