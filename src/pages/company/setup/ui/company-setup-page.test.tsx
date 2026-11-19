import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useCompanySession } from "@/shared/auth";
import { companySessionFixture } from "../../../../test/audience-fixtures";
import {
  accessPolicyBody,
  activationBody,
  organizationCanaries,
  profileBody,
  setupBody,
  setupStep,
  stepIds,
} from "../../../../test/company-organization-fixtures";
import { problemBody } from "../../../../test/operation-fakes";
import { operationNetwork } from "../../../../test/operation-request-mock";
import { CompanySetupPage } from "./company-setup-page";

vi.mock("@tanstack/react-router", async (original) => ({
  ...(await original<typeof import("@tanstack/react-router")>()),
  Link: ({ children, to, className }: { children: ReactNode; to: string; className?: string }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}));

const setupRead = "GET /api/v1/company/setup";
const startKey = "POST /api/v1/company/setup/{stepPublicId}/start";
const completeKey = "POST /api/v1/company/setup/{stepPublicId}/complete";
const skipKey = "POST /api/v1/company/setup/{stepPublicId}/skip";
const allPermissions = [
  "company-setup:read",
  "company-setup:update",
  "company-profiles:read",
  "company-activation:read",
  "company-access-policies:read",
  "companies:read",
];

function renderSetup({
  permissions = allPermissions,
  steps = [setupStep("SET_COMPANY_PROFILE", "IN_PROGRESS"), setupStep("SET_ROLES", "PENDING")],
  mode = "NORMAL",
  profileStatus = "COMPLETE",
}: {
  permissions?: string[];
  steps?: ReturnType<typeof setupStep>[];
  mode?: string;
  profileStatus?: string;
} = {}) {
  operationNetwork.install();
  const current = operationNetwork.current;
  current.on(setupRead, () => ({ status: 200, body: setupBody(steps) }));
  current.on("GET /api/v1/company/profile", () => ({
    status: 200,
    body: profileBody({ status: profileStatus }),
  }));
  current.on("GET /api/v1/company/activation", () => ({ status: 200, body: activationBody() }));
  current.on("GET /api/v1/company/access-policy", () => ({
    status: 200,
    body: accessPolicyBody(mode),
  }));
  current.on("GET /api/v1/company/registry", () => ({ status: 200, body: {} }));
  useCompanySession.getState().setSession(companySessionFixture({ permissions }));
  const queries = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queries}>
      <CompanySetupPage />
    </QueryClientProvider>,
  );
  return current;
}

afterEach(() => {
  cleanup();
  useCompanySession.getState().clearSession();
});

describe("Company setup checklist", () => {
  it("offers only the transitions valid for each step's current server state", async () => {
    renderSetup({
      steps: [
        setupStep("SET_COMPANY_PROFILE", "COMPLETED"),
        setupStep("SET_ROLES", "IN_PROGRESS"),
        setupStep("SET_BRANCHES", "PENDING"),
      ],
    });
    const profile = await screen.findByRole("listitem", { name: "Organization profile" });
    expect(within(profile).queryByRole("button")).toBeNull();
    const roles = screen.getByRole("listitem", { name: "Roles" });
    expect(within(roles).getByRole("button", { name: "Complete Roles" })).toBeEnabled();
    expect(within(roles).queryByRole("button", { name: "Start Roles" })).toBeNull();
    const branches = screen.getByRole("listitem", { name: "Branches" });
    expect(within(branches).getByRole("button", { name: "Start Branches" })).toBeEnabled();
    expect(within(branches).queryByRole("button", { name: "Complete Branches" })).toBeNull();
  });

  it("starts a step with its public ID only and applies the authoritative result", async () => {
    const net = renderSetup();
    net.on(startKey, () => ({ status: 200, body: setupStep("SET_ROLES", "IN_PROGRESS") }));
    fireEvent.click(await screen.findByRole("button", { name: "Start Roles" }));
    expect(await screen.findByText("Roles started.")).toBeInTheDocument();
    expect(net.calls.find((call) => call.key === startKey)).toEqual({
      audience: "company",
      key: startKey,
      input: { params: { stepPublicId: stepIds.roles } },
    });
    expect(net.count(setupRead)).toBeGreaterThanOrEqual(2);
  });

  it("reconciles a stale transition instead of claiming it and never retries it", async () => {
    const net = renderSetup();
    net.on(startKey, () => ({ status: 400, body: problemBody(400) }));
    fireEvent.click(await screen.findByRole("button", { name: "Start Roles" }));
    expect(
      await screen.findByText(
        "This step changed since you opened the checklist. It has been refreshed; review it before trying again.",
      ),
    ).toBeInTheDocument();
    await waitFor(() => expect(net.count(setupRead)).toBe(2));
    expect(net.count(startKey)).toBe(1);
    expect(screen.queryByText("Roles started.")).toBeNull();
  });

  it("keeps an ambiguous failure uncertain and re-reads before another attempt", async () => {
    const net = renderSetup();
    net.on(completeKey, () => {
      throw new TypeError("Failed to fetch");
    });
    fireEvent.click(await screen.findByRole("button", { name: "Complete Organization profile" }));
    expect(
      await screen.findByText(
        "We could not confirm the change. The checklist was refreshed; check the step before trying again.",
      ),
    ).toBeInTheDocument();
    expect(net.count(completeKey)).toBe(1);
    await waitFor(() => expect(net.count(setupRead)).toBe(2));
  });

  it("disables completing the profile step until the organization profile is complete", async () => {
    renderSetup({ profileStatus: "INCOMPLETE" });
    const complete = await screen.findByRole("button", { name: "Complete Organization profile" });
    await waitFor(() => expect(complete).toBeDisabled());
    expect(screen.getAllByText("Complete the organization profile first.").length).toBeGreaterThan(
      0,
    );
    expect(screen.getAllByRole("link", { name: "Open organization profile" })[0]).toHaveAttribute(
      "href",
      "/company/profile",
    );
  });

  it.each([
    "READ_ONLY",
    "FROZEN",
    "MAINTENANCE",
  ])("keeps reads but disables every transition in %s mode", async (mode) => {
    renderSetup({ mode });
    const start = await screen.findByRole("button", { name: "Start Roles" });
    await waitFor(() => expect(start).toBeDisabled());
    expect(screen.getByRole("heading", { level: 2, name: /Your company workspace/ })).toBeVisible();
  });

  it("records a validated access refusal against the policy and disables transitions", async () => {
    const net = renderSetup();
    net.on(startKey, () => ({
      status: 403,
      body: problemBody(403, { code: "COMPANY_ACCESS_DENIED", mode: "READ_ONLY" }),
    }));
    net.on("GET /api/v1/company/access-policy", () => ({
      status: 200,
      body: accessPolicyBody("READ_ONLY", "Billing review"),
    }));
    fireEvent.click(await screen.findByRole("button", { name: "Start Roles" }));
    expect(
      await screen.findByText(
        "Changes are paused for your company workspace. The checklist was refreshed.",
      ),
    ).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "Start Roles" })).toBeDisabled());
    expect(await screen.findByText("Billing review")).toBeInTheDocument();
    expect(net.count(startKey)).toBe(1);
  });

  it("fails closed with an honest reason when the access mode cannot be read", async () => {
    const net = renderSetup({ permissions: ["company-setup:read", "company-setup:update"] });
    const start = await screen.findByRole("button", { name: "Start Roles" });
    expect(start).toBeDisabled();
    expect(
      screen.getAllByText(
        "Changes are unavailable because your workspace access could not be confirmed.",
      ).length,
    ).toBeGreaterThan(0);
    expect(net.count("GET /api/v1/company/access-policy")).toBe(0);
  });

  it("hides transitions without the update permission and hides unpermitted reads", async () => {
    const net = renderSetup({ permissions: ["company-setup:read"] });
    await screen.findByRole("listitem", { name: "Roles" });
    expect(screen.queryByRole("button", { name: /Start|Complete|Skip/ })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Activation" })).toBeNull();
    expect(net.count("GET /api/v1/company/profile")).toBe(0);
    expect(net.count("GET /api/v1/company/activation")).toBe(0);
  });

  it("confirms a skip, names the consequence, and can be cancelled", async () => {
    const net = renderSetup();
    net.on(skipKey, () => ({ status: 200, body: setupStep("SET_ROLES", "SKIPPED") }));
    fireEvent.click(await screen.findByRole("button", { name: "Skip Roles" }));
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("This step is required.");
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(net.count(skipKey)).toBe(0);
    fireEvent.click(screen.getByRole("button", { name: "Skip Roles" }));
    fireEvent.click(
      within(await screen.findByRole("dialog")).getByRole("button", { name: "Skip" }),
    );
    expect(await screen.findByText("Roles skipped.")).toBeInTheDocument();
    expect(net.count(skipKey)).toBe(1);
  });

  it("pauses actions after a malformed transition response", async () => {
    const net = renderSetup();
    net.on(startKey, () => ({ status: 200, body: { publicId: "not-a-step" } }));
    fireEvent.click(await screen.findByRole("button", { name: "Start Roles" }));
    expect(
      await screen.findByText(
        "Setup actions are paused because a response could not be verified. Reload the page later.",
      ),
    ).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "Start Roles" })).toBeDisabled());
  });

  it("never renders identifiers or backend free text", async () => {
    renderSetup();
    await screen.findByText("The organization profile is incomplete");
    for (const canary of [...organizationCanaries, stepIds.profile, stepIds.roles])
      expect(document.body.textContent).not.toContain(canary);
  });
});
