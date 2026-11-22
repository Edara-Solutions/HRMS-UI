import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OperationRefusal } from "@/shared/api";
import { useCompanySession } from "@/shared/auth";
import { companySelfSchemas } from "@/shared/company-self";
import { platformSelfSchemas } from "@/shared/platform-self";
import { companySessionFixture } from "../../../test/audience-fixtures";
import type { SelfService } from "../api/self-service";
import { ProfileEditor } from "./profile-editor";
import { SessionList } from "./session-list";

vi.mock("@tanstack/react-router", async (original) => ({
  ...(await original<typeof import("@tanstack/react-router")>()),
  useNavigate: () => vi.fn(),
}));

const profile = {
  employeeCode: "EMP-1",
  phone: "+201000000000",
  level: null,
  hireDate: null,
  locale: "en",
  timezone: "UTC",
  photoUrl: null,
};
const row = {
  id: "a51718df-4ac1-4cbd-92fc-abc16b590c2b",
  clientType: "web" as const,
  deviceName: "My browser",
  ipAddress: "127.0.0.1",
  city: null,
  country: null,
  createdAt: "2026-09-27T00:00:00Z",
  lastUsedAt: "2026-09-27T00:00:00Z",
  isCurrent: true,
};

function companyService() {
  return {
    schemas: companySelfSchemas,
    readProfile: vi.fn().mockResolvedValue(profile),
    updateProfile: vi.fn().mockResolvedValue(profile),
    changeEmail: vi.fn().mockResolvedValue(undefined),
    readSessions: vi.fn().mockResolvedValue({
      items: [row],
      meta: { mode: "page", page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
    }),
    revokeSession: vi.fn().mockResolvedValue(undefined),
    signOut: vi.fn().mockResolvedValue({ remoteConfirmed: true }),
  } satisfies SelfService;
}

const otherRow = {
  ...row,
  id: "6f1d1c1e-2b8f-4e0a-9d43-6f2a3c9b7e10",
  deviceName: "Office laptop",
  isCurrent: false,
};

function platformSessions(items: Array<typeof row>) {
  return {
    items,
    meta: { mode: "page" as const, page: 1, pageSize: 20, totalItems: items.length, totalPages: 1 },
  };
}

function platformService() {
  return { ...companyService(), schemas: platformSelfSchemas };
}

const platformIdentity = { audience: "platform" as const, publicId: "platform-user" };

function renderWorkflow(children: ReactNode) {
  const queries = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={queries}>{children}</QueryClientProvider>);
  return queries;
}

const identity = { audience: "company" as const, publicId: "company-user" };

afterEach(() => {
  cleanup();
  useCompanySession.getState().clearSession();
});

describe("SELF profile workflow", () => {
  it("sends only changed fields and represents a nullable clear as null", async () => {
    const service = companyService();
    renderWorkflow(<ProfileEditor identity={identity} service={service} />);
    fireEvent.change(await screen.findByLabelText("Phone number"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(service.updateProfile).toHaveBeenCalledWith({ phone: null }));
  });

  it("keeps the draft while reconciling an ambiguous save before a manual retry", async () => {
    const service = companyService();
    service.updateProfile.mockRejectedValueOnce(new Error("network canary"));
    const queries = renderWorkflow(<ProfileEditor identity={identity} service={service} />);
    fireEvent.change(await screen.findByLabelText("Phone number"), {
      target: { value: "+201111111111" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(service.readProfile).toHaveBeenCalledTimes(2));
    expect(screen.getByLabelText("Phone number")).toHaveValue("+201111111111");
    expect(service.updateProfile).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("network canary")).not.toBeInTheDocument();
    queries.clear();
  });
});

describe("SELF sessions workflow", () => {
  it("confirms Company revocation before calling the exact selected session", async () => {
    useCompanySession.getState().setSession(companySessionFixture());
    const service = companyService();
    renderWorkflow(<SessionList identity={identity} service={service} />);
    fireEvent.click(await screen.findByRole("button", { name: "Revoke session" }));
    expect(service.revokeSession).not.toHaveBeenCalled();
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Revoke session" }),
    );
    await waitFor(() => expect(service.revokeSession).toHaveBeenCalledWith(row.id));
  });

  it("revokes another Platform session after confirmation and never offers the current one", async () => {
    const service = platformService();
    service.readSessions
      .mockResolvedValueOnce(platformSessions([row, otherRow]))
      .mockResolvedValue(platformSessions([row]));
    renderWorkflow(<SessionList identity={platformIdentity} service={service} />);
    const revokeButtons = await screen.findAllByRole("button", { name: "Revoke session" });
    expect(revokeButtons).toHaveLength(1);
    fireEvent.click(revokeButtons[0]);
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Revoke session" }),
    );
    await waitFor(() => expect(service.revokeSession).toHaveBeenCalledWith(otherRow.id));
    expect(await screen.findByText("The session has been revoked.")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText("Office laptop")).not.toBeInTheDocument());
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Revoke session" })).not.toBeInTheDocument(),
    );
  });

  it("refreshes the Platform list when the session has already ended", async () => {
    const service = platformService();
    service.readSessions
      .mockResolvedValueOnce(platformSessions([row, otherRow]))
      .mockResolvedValue(platformSessions([row]));
    service.revokeSession.mockRejectedValueOnce(
      new OperationRefusal(
        {
          audience: "platform",
          key: "DELETE /api/v1/platform/me/sessions/{sessionId}",
          parseResponse: () => undefined,
        },
        404,
        { detail: "internal canary" },
      ),
    );
    renderWorkflow(<SessionList identity={platformIdentity} service={service} />);
    fireEvent.click(await screen.findByRole("button", { name: "Revoke session" }));
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Revoke session" }),
    );
    expect(await screen.findByText("That session has already ended.")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText("Office laptop")).not.toBeInTheDocument());
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.queryByText("internal canary")).not.toBeInTheDocument();
  });

  it("shows an empty list without a fabricated page count", async () => {
    const service = companyService();
    service.readSessions.mockResolvedValue({
      items: [],
      meta: { mode: "page", page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
    });
    renderWorkflow(<SessionList identity={identity} service={service} />);
    expect(await screen.findByText("No sessions to show.")).toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });
});
