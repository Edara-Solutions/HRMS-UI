import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useCompanySession } from "@/shared/auth";
import { companySessionFixture } from "../../../../test/audience-fixtures";
import {
  accessPolicyBody,
  activationBody,
  organizationCanaries,
  registryBody,
  setupBody,
  setupStep,
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
  "company-activation:read",
  "company-subscriptions:read",
  "company-access-policies:read",
  "company-setup:read",
  "companies:email-readiness:read",
  "company-profiles:read",
];

function renderDashboard(
  permissions: string[] = everyRead,
  override: (net: ReturnType<typeof createOperationNetwork>) => void = () => {},
) {
  operationNetwork.install();
  const net = operationNetwork.current;
  net.on("GET /api/v1/company/registry", () => ({ status: 200, body: registryBody() }));
  net.on("GET /api/v1/company/activation", () => ({ status: 200, body: activationBody() }));
  net.on("GET /api/v1/company/subscription", () => ({ status: 200, body: subscriptionBody() }));
  net.on("GET /api/v1/company/access-policy", () => ({
    status: 200,
    body: accessPolicyBody("READ_ONLY", "Billing review"),
  }));
  net.on("GET /api/v1/company/setup", () => ({
    status: 200,
    body: setupBody([
      setupStep("SET_COMPANY_PROFILE", "COMPLETED"),
      setupStep("SET_ROLES", "PENDING"),
      setupStep("SET_BRANCHES", "SKIPPED"),
    ]),
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

describe("Company operational dashboard", () => {
  it("separates the labelled demo overview from permitted organization reads", async () => {
    renderDashboard();
    expect(await screen.findByRole("heading", { level: 1, name: "Edara Labs" })).toBeVisible();
    const activation = screen.getByRole("region", { name: "Activation" });
    expect(
      await within(activation).findByText("The organization profile is incomplete"),
    ).toBeVisible();
    const setup = screen.getByRole("region", { name: "Setup progress" });
    expect(await within(setup).findByText("2 of 3 steps resolved")).toBeVisible();
    expect(within(setup).getByText("1 required step remaining")).toBeVisible();
    expect(
      await within(screen.getByRole("region", { name: "Subscription" })).findByText("Growth"),
    ).toBeVisible();
    const access = screen.getByRole("region", { name: "Workspace access" });
    expect(await within(access).findByText("Read-only")).toBeVisible();
    expect(within(access).getByText("Billing review")).toBeVisible();
    expect(
      await within(screen.getByRole("region", { name: "Email readiness" })).findByText(
        "The sending domain is not verified yet.",
      ),
    ).toBeVisible();
    const demo = screen.getByRole("region", { name: "Sample overview · May 2026" });
    expect(within(demo).getByText("Demo data")).toBeVisible();
    expect(within(demo).getByText(/not current company records/)).toBeVisible();
    for (const canary of organizationCanaries)
      expect(document.body.textContent).not.toContain(canary);
  });

  it("offers no Platform lifecycle, activation or policy commands", async () => {
    renderDashboard();
    await screen.findByRole("heading", { level: 1, name: "Edara Labs" });
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual([
      "/company/setup",
      "/company/profile",
    ]);
  });

  it("omits panels and requests the identity may not read", async () => {
    const net = renderDashboard(["company-setup:read"]);
    expect(await screen.findByRole("region", { name: "Setup progress" })).toBeVisible();
    expect(screen.queryByRole("region", { name: "Activation" })).toBeNull();
    expect(screen.queryByRole("region", { name: "Subscription" })).toBeNull();
    await waitFor(() =>
      expect(net.calls.map((call) => call.key)).toEqual(["GET /api/v1/company/setup"]),
    );
    expect(screen.getByRole("heading", { level: 1, name: "Company overview" })).toBeVisible();
  });

  it("isolates a malformed read to its own panel without retrying it", async () => {
    renderDashboard(everyRead, (net) =>
      net.on("GET /api/v1/company/subscription", () => ({
        status: 200,
        body: { subscription: { status: "UNKNOWN_STATUS" }, history: [] },
      })),
    );
    const subscription = await screen.findByRole("region", { name: "Subscription" });
    expect(
      await within(subscription).findByText(
        "This information is temporarily unavailable. Actions that depend on it are paused.",
      ),
    ).toBeVisible();
    expect(within(subscription).queryByRole("button", { name: "Try again" })).toBeNull();
    expect(
      await within(screen.getByRole("region", { name: "Setup progress" })).findByText(
        "2 of 3 steps resolved",
      ),
    ).toBeVisible();
    expect(document.body.textContent).not.toContain("UNKNOWN_STATUS");
  });

  it("keeps an offline read inside its panel with a manual retry", async () => {
    renderDashboard(everyRead, (net) =>
      net.on("GET /api/v1/company/email-readiness", () => {
        throw new TypeError("Failed to fetch");
      }),
    );
    const email = await screen.findByRole("region", { name: "Email readiness" });
    expect(await within(email).findByRole("button", { name: "Try again" })).toBeVisible();
    expect(within(email).getByText("This information could not be loaded.")).toBeVisible();
  });
});
