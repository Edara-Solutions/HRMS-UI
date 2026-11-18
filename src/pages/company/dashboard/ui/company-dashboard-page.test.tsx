import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useCompanySession } from "@/shared/auth";
import { companySessionFixture } from "../../../../test/audience-fixtures";
import {
  accessPolicyBody,
  registryBody,
  stepIds,
  subscriptionBody,
} from "../../../../test/company-organization-fixtures";
import type { createOperationNetwork } from "../../../../test/operation-fakes";
import { operationNetwork } from "../../../../test/operation-request-mock";
import { CompanyDashboardPage } from "./company-dashboard-page";

vi.mock("@tanstack/react-router", async (original) => ({
  ...(await original<typeof import("@tanstack/react-router")>()),
  Link: ({ children, to, className }: { children: ReactNode; to: string; className?: string }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}));

const everyRead = [
  "companies:read",
  "company-subscriptions:read",
  "company-access-policies:read",
  "companies:email-readiness:read",
  "users:read",
  "users:create",
];

const fullOverview = {
  people: {
    total: 12,
    byStatus: { ACTIVE: 9, ONBOARDING: 2, SUSPENDED: 1 },
    createdThisMonth: 3,
    createdLastMonth: 4,
  },
  invitations: { pending: 2 },
  roles: { total: 5 },
  setup: {
    completed: 1,
    total: 4,
    nextSteps: [{ publicId: stepIds.roles, stepType: "SET_ROLES", status: "PENDING" }],
  },
  recentActivity: [],
};

function renderDashboard(
  overview: unknown = fullOverview,
  permissions: string[] = everyRead,
  override: (net: ReturnType<typeof createOperationNetwork>) => void = () => {},
) {
  operationNetwork.install();
  const net = operationNetwork.current;
  net.on("GET /api/v1/company/overview", () => ({ status: 200, body: overview }));
  net.on("GET /api/v1/company/registry", () => ({ status: 200, body: registryBody() }));
  net.on("GET /api/v1/company/subscription", () => ({ status: 200, body: subscriptionBody() }));
  net.on("GET /api/v1/company/access-policy", () => ({
    status: 200,
    body: accessPolicyBody("NORMAL", null),
  }));
  net.on("GET /api/v1/company/email-readiness", () => ({
    status: 200,
    body: { ready: false, reason: "NOT_VERIFIED" },
  }));
  override(net);
  useCompanySession.getState().setSession(companySessionFixture({ permissions }));
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <CompanyDashboardPage />
    </QueryClientProvider>,
  );
  return net;
}

afterEach(() => {
  cleanup();
  useCompanySession.getState().clearSession();
});

describe("Company dashboard", () => {
  it("builds the cards, status chart and next steps from one overview read with activity", async () => {
    const net = renderDashboard();
    const people = await screen.findByRole("region", { name: "People" });
    expect(within(people).getByText("12")).toBeInTheDocument();
    expect(within(people).getByText("+3 this month")).toBeInTheDocument();
    expect(within(people).getByText("4 added last month")).toBeInTheDocument();
    expect(
      within(screen.getByRole("region", { name: "Pending invitations" })).getByText("2"),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("region", { name: "Roles" })).getByText("5"),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("region", { name: "Setup progress" })).getByText("1/4"),
    ).toBeInTheDocument();
    const byStatus = screen.getByRole("region", { name: "People by status" });
    expect(within(byStatus).getByText("Onboarding")).toBeInTheDocument();
    expect(
      within(screen.getByRole("region", { name: "Next setup steps" })).getByText("Roles"),
    ).toBeInTheDocument();
    expect(net.count("GET /api/v1/company/overview")).toBe(1);
    expect(net.calls.find((call) => call.key === "GET /api/v1/company/overview")?.input).toEqual({
      query: { include: "recentActivity" },
    });
  });

  it("leaves out every section the overview does not return", async () => {
    renderDashboard({ roles: { total: 5 } });
    await screen.findByRole("region", { name: "Roles" });
    expect(screen.queryByRole("region", { name: "People" })).toBeNull();
    expect(screen.queryByRole("region", { name: "People by status" })).toBeNull();
    expect(screen.queryByRole("region", { name: "Next setup steps" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Review setup" })).toBeNull();
  });

  it("explains an overview with nothing the role may read", async () => {
    renderDashboard({});
    expect(await screen.findByText("Nothing to show yet")).toBeInTheDocument();
  });

  it("keeps only the compact status rail beside the overview", async () => {
    const net = renderDashboard();
    const rail = await screen.findByRole("complementary", { name: "Workspace status" });
    expect(within(rail).getByRole("region", { name: "Subscription" })).toBeInTheDocument();
    expect(within(rail).getByRole("region", { name: "Workspace access" })).toBeInTheDocument();
    expect(await within(rail).findByText("Not ready")).toBeInTheDocument();
    expect(net.count("GET /api/v1/company/activation")).toBe(0);
    expect(net.count("GET /api/v1/company/setup")).toBe(0);
  });

  it("offers Add person only to callers who may create people", async () => {
    renderDashboard(
      fullOverview,
      everyRead.filter((permission) => permission !== "users:create"),
    );
    await screen.findByRole("region", { name: "People" });
    expect(screen.queryByRole("link", { name: "Add person" })).toBeNull();
    expect(screen.getByRole("link", { name: "Review setup" })).toBeInTheDocument();
  });

  it("does not render an overview that fails the contract", async () => {
    renderDashboard({ people: { total: "twelve" } });
    expect(
      await screen.findByText("The response could not be verified. This section is unavailable."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
  });
});
