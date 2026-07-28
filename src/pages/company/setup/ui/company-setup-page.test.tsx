import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CompanySetupPage } from "./company-setup-page";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  useCurrentSession: vi.fn(),
  useCompanyProfile: vi.fn(),
  useCompanySetupChecklist: vi.fn(),
  useCompanyActivation: vi.fn(),
  useStartSetupStep: vi.fn(),
  useCompleteSetupStep: vi.fn(),
  useSkipSetupStep: vi.fn(),
}));

vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-router")>()),
  Link: ({ children, to, ...props }: { children: ReactNode; to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useNavigate: () => mocks.navigate,
}));

vi.mock("@/shared/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/auth")>()),
  useCurrentSession: mocks.useCurrentSession,
}));

vi.mock("../api/company-setup", () => ({
  useCompanyProfile: mocks.useCompanyProfile,
  useCompanySetupChecklist: mocks.useCompanySetupChecklist,
  useCompanyActivation: mocks.useCompanyActivation,
  useStartSetupStep: mocks.useStartSetupStep,
  useCompleteSetupStep: mocks.useCompleteSetupStep,
  useSkipSetupStep: mocks.useSkipSetupStep,
}));

const SESSION = {
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
};

const PROFILE = {
  publicId: "profile-1",
  companyPublicId: "company-1",
  name: "Northwind Egypt",
  logoUrl: null,
  email: "owner@example.com",
  phone: null,
  country: null,
  city: null,
  addressLine: null,
  taxNumber: null,
  commercialNumber: null,
  status: "INCOMPLETE",
  createdAt: "2026-07-27T09:00:00.000Z",
  updatedAt: "2026-07-27T09:00:00.000Z",
};

const STEPS = {
  companyPublicId: "company-1",
  templateVersion: 2,
  steps: [
    {
      publicId: "22222222-2222-4222-8222-222222222222",
      stepType: "SET_ROLES",
      status: "PENDING",
      isRequired: true,
      sequence: 2,
      templateVersion: 2,
      dependencies: ["SET_COMPANY_PROFILE"],
      startedAt: null,
      completedAt: null,
      createdAt: "2026-07-27T09:10:00.000Z",
      updatedAt: "2026-07-27T09:10:00.000Z",
    },
    {
      publicId: "11111111-1111-4111-8111-111111111111",
      stepType: "SET_COMPANY_PROFILE",
      status: "PENDING",
      isRequired: true,
      sequence: 1,
      templateVersion: 2,
      dependencies: [],
      startedAt: null,
      completedAt: null,
      createdAt: "2026-07-27T09:00:00.000Z",
      updatedAt: "2026-07-27T09:00:00.000Z",
    },
  ],
};

const ACTIVATION = {
  companyPublicId: "company-1",
  lifecycleStatus: "ONBOARDING",
  activatedAt: null,
  canActivate: false,
  unmetRequirements: [
    {
      code: "COMPANY_PROFILE_INCOMPLETE",
      message: "Fill the profile first.",
      details: {},
    },
  ],
};

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((value) => {
    resolve = value;
  });
  return { promise, resolve };
}

function setOwnerSession() {
  mocks.useCurrentSession.mockReturnValue({
    accessToken: SESSION.accessToken,
    refreshToken: SESSION.refreshToken,
    sessionId: SESSION.sessionId,
    expiresIn: SESSION.expiresIn,
    user: SESSION.user,
  });
}

function setDefaultQueries() {
  mocks.useCompanyProfile.mockReturnValue({
    data: PROFILE,
    isPending: false,
    isError: false,
    refetch: vi.fn(),
  });
  mocks.useCompanySetupChecklist.mockReturnValue({
    data: STEPS,
    isPending: false,
    isError: false,
    refetch: vi.fn(),
  });
  mocks.useCompanyActivation.mockReturnValue({
    data: ACTIVATION,
    refetch: vi.fn(),
  });
}

function renderPage() {
  render(<CompanySetupPage />);
}

describe("CompanySetupPage", () => {
  beforeEach(() => {
    setOwnerSession();
    setDefaultQueries();
    mocks.useStartSetupStep.mockReturnValue({ mutateAsync: vi.fn() });
    mocks.useCompleteSetupStep.mockReturnValue({ mutateAsync: vi.fn() });
    mocks.useSkipSetupStep.mockReturnValue({ mutateAsync: vi.fn() });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders steps sorted by sequence and keeps profile completion disabled until the profile is authoritative", () => {
    renderPage();

    const titles = screen.getAllByRole("heading", { level: 3 }).map((node) => node.textContent);
    expect(titles).toEqual([
      "Profile snapshot",
      "Company profile",
      "Roles",
      "Activation",
      "Checklist snapshot",
    ]);
    expect(screen.getByRole("button", { name: "Complete Company profile" })).toBeDisabled();
    expect(
      screen.getByText("Step public ID: 11111111-1111-4111-8111-111111111111"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Step public ID: 22222222-2222-4222-8222-222222222222"),
    ).toBeInTheDocument();
  });

  it("marks only the active command as loading while a step command is in flight", async () => {
    const start = deferred<{ publicId: string }>();
    const startMutation = vi.fn(() => start.promise);
    mocks.useStartSetupStep.mockReturnValue({ mutateAsync: startMutation });
    renderPage();

    const startButton = screen.getByRole("button", { name: "Start Roles" });
    const completeButton = screen.getByRole("button", { name: "Complete Roles" });
    const skipButton = screen.getByRole("button", { name: "Skip Roles" });

    fireEvent.click(startButton);

    expect(startMutation).toHaveBeenCalledWith({
      companyPublicId: "company-1",
      stepPublicId: "22222222-2222-4222-8222-222222222222",
    });
    expect(startButton).toBeDisabled();
    expect(startButton).toHaveAttribute("aria-busy", "true");
    expect(completeButton).toBeEnabled();
    expect(skipButton).toBeEnabled();

    await act(async () => {
      start.resolve({ publicId: "22222222-2222-4222-8222-222222222222" });
      await start.promise;
    });
  });
});
