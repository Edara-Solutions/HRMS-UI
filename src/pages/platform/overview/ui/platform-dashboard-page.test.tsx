import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { usePlatformSession } from "@/shared/auth";
import { platformSessionFixture } from "../../../../test/audience-fixtures";
import { operationNetwork } from "../../../../test/operation-request-mock";
import { PlatformDashboardPage } from "./platform-dashboard-page";

vi.mock("@tanstack/react-router", async (original) => ({
  ...(await original<typeof import("@tanstack/react-router")>()),
  Link: ({ children, to, className }: { children: ReactNode; to: string; className?: string }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}));

vi.mock("@/shared/api/operation-request", async (original) => {
  const actual =
    await original<
      Pick<typeof import("@/shared/api"), "executeOperationRequest" | "OperationRefusal">
    >();
  return {
    ...actual,
    executeOperationRequest: (client: never, operation: never, input: unknown) =>
      operationNetwork.current.execute(client, operation, input, actual.OperationRefusal),
  };
});

const companyId = "5b1d6a3e-8f5c-4d9a-9c1e-2f3a4b5c6d7e";

const fullOverview = {
  companies: {
    total: 10,
    byLifecycle: { ACTIVE: 8, ONBOARDING: 1, SUSPENDED: 1 },
    createdThisMonth: 2,
    createdLastMonth: 3,
    latest: [
      {
        publicId: companyId,
        name: "Nile Logistics",
        companyCode: "NILE01",
        lifecycleStatus: "ACTIVE",
        createdAt: "2026-11-10T09:00:00.000Z",
      },
    ],
  },
  subscriptions: { active: 7 },
  leads: { open: 93, createdThisMonth: 0, createdLastMonth: 5 },
  conversionRequests: { pending: 1 },
  recentActivity: [],
};

const everyRead = [
  "companies:read",
  "company-subscriptions:read",
  "leads:read",
  "leads:create",
  "lead-conversion-requests:read",
  "audit-events:read",
];

function renderDashboard(overview: unknown = fullOverview, permissions = everyRead) {
  const net = operationNetwork.install();
  net.on("GET /api/v1/platform/overview", () => ({ status: 200, body: overview }));
  usePlatformSession.getState().setSession(platformSessionFixture({ permissions }));
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <PlatformDashboardPage />
    </QueryClientProvider>,
  );
  return net;
}

afterEach(() => {
  cleanup();
  usePlatformSession.getState().clearSession();
});

describe("Platform dashboard", () => {
  it("builds every section from one overview read with recent activity", async () => {
    const net = renderDashboard();
    const companies = await screen.findByRole("region", { name: "Companies" });
    expect(within(companies).getByText("10")).toBeInTheDocument();
    expect(within(companies).getByText("+2 this month")).toBeInTheDocument();
    expect(
      within(screen.getByRole("region", { name: "Active subscriptions" })).getByText("7"),
    ).toBeInTheDocument();
    const leads = screen.getByRole("region", { name: "Open leads" });
    expect(within(leads).getByText("93")).toBeInTheDocument();
    expect(within(leads).getByText("None this month")).toBeInTheDocument();
    expect(
      within(screen.getByRole("region", { name: "Pending conversion requests" })).getByText("1"),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("region", { name: "Companies by lifecycle" })).getByText(
        "Onboarding",
      ),
    ).toBeInTheDocument();
    const recent = screen.getByRole("region", { name: "Recent companies" });
    expect(within(recent).getByText("Nile Logistics")).toBeInTheDocument();
    expect(screen.getByText("No recent activity yet.")).toBeInTheDocument();
    expect(net.count("GET /api/v1/platform/overview")).toBe(1);
    expect(net.calls[0]?.input).toEqual({ query: { include: "recentActivity" } });
  });

  it("leaves out sections the overview does not return and gates the actions", async () => {
    renderDashboard({ leads: { open: 4, createdThisMonth: 1, createdLastMonth: 0 } }, [
      "leads:read",
    ]);
    await screen.findByRole("region", { name: "Open leads" });
    expect(screen.queryByRole("region", { name: "Companies" })).toBeNull();
    expect(screen.queryByRole("region", { name: "Recent companies" })).toBeNull();
    expect(screen.queryByRole("link", { name: "View companies" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Add lead" })).toBeNull();
  });

  it("explains an overview with nothing the role may read", async () => {
    renderDashboard({}, []);
    expect(await screen.findByText("Nothing to show yet")).toBeInTheDocument();
  });

  it("shows no demo or invented figures", async () => {
    renderDashboard();
    await screen.findByRole("region", { name: "Companies" });
    expect(document.body).not.toHaveTextContent(/Demo data|SAR|99\.8%|Swift Systems/);
  });

  it("does not render an overview that fails the contract", async () => {
    renderDashboard({ companies: { total: "ten" } });
    expect(
      await screen.findByText("The response could not be verified. This section is unavailable."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
  });
});
