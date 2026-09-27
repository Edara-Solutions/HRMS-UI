import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { usePlatformSession } from "@/shared/auth";
import { platformSessionFixture } from "../../../../test/audience-fixtures";
import { problemBody } from "../../../../test/operation-fakes";
import { operationNetwork } from "../../../../test/operation-request-mock";
import {
  companyActivationBody,
  companyBody,
  companyCommercialBody,
  companyIds,
  companyPermissions,
  companyPolicyBody,
  companySubscriptionBody,
} from "../../../../test/platform-company-fixtures";
import { navigations } from "../../../../test/router-mock";
import { PlatformCompanyDetailPage } from "./platform-company-detail-page";

function open(
  options: { status?: string; permissions?: string[]; frozen?: boolean; ready?: boolean } = {},
) {
  const net = operationNetwork.install();
  const session = platformSessionFixture({
    permissions: options.permissions ?? companyPermissions,
  });
  usePlatformSession.getState().setSession(session);
  net.on("GET /api/v1/platform/me", () => ({ status: 200, body: session.user }));
  net.on("GET /api/v1/platform/companies/{publicId}", () => ({
    status: 200,
    body: companyBody({ lifecycleStatus: options.status ?? "ACTIVE" }),
  }));
  net.on("GET /api/v1/platform/companies/{publicId}/access-policy", () => ({
    status: 200,
    body: companyPolicyBody(),
  }));
  net.on("GET /api/v1/platform/companies/{publicId}/activation", () => ({
    status: 200,
    body: companyActivationBody(options.ready ?? false),
  }));
  net.on("GET /api/v1/platform/companies/{publicId}/commercial-config", () => ({
    status: 200,
    body: {
      ...companyCommercialBody(options.frozen),
      siteStatus: {
        ...companyCommercialBody(options.frozen).siteStatus,
        isBlocked: options.status === "SUSPENDED",
      },
    },
  }));
  net.on("GET /api/v1/platform/companies/{publicId}/subscription", () => ({
    status: 200,
    body: companySubscriptionBody(),
  }));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <PlatformCompanyDetailPage publicId={companyIds.company} />
    </QueryClientProvider>,
  );
  return { net, client };
}
afterEach(() => {
  cleanup();
  usePlatformSession.getState().clearSession();
});
async function click(name: string) {
  const button = await screen.findByRole("button", { name });
  await waitFor(() => expect(button).toBeEnabled());
  fireEvent.click(button);
}
async function confirm(name: string) {
  const dialog = await screen.findByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name }));
}

describe("Platform Company workspace", () => {
  it("keeps independent labelled states and minimizes response details", async () => {
    const { net, client } = open();
    expect(await screen.findByText("Registry isActive (read-only)")).toBeInTheDocument();
    expect(await screen.findByText("Required setup incomplete")).toBeInTheDocument();
    expect(screen.getByText("Effective access mode")).toBeInTheDocument();
    expect(screen.getByText("Activation readiness")).toBeInTheDocument();
    expect(screen.getByText("Commercial configuration (read-only)")).toBeInTheDocument();
    expect(screen.getByText("Subscription and trial")).toBeInTheDocument();
    expect(screen.queryByText(/canary/)).toBeNull();
    expect(screen.queryByRole("button", { name: "Run due-trial expiry" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Access Session/ })).toBeNull();
    expect(net.calls.every((call) => call.audience === "platform")).toBe(true);
    expect(net.calls.some((call) => call.key.startsWith("POST"))).toBe(false);
    expect(
      client
        .getQueryCache()
        .getAll()
        .every(
          (query) =>
            query.queryKey[0] === "platform" &&
            query.queryKey[1] === platformSessionFixture().user.publicId,
        ),
    ).toBe(true);
  });
  it("saves only safe registry fields", async () => {
    const { net } = open();
    net.on("PATCH /api/v1/platform/companies/{publicId}", () => ({
      status: 200,
      body: companyBody(),
    }));
    const input = await screen.findByLabelText("Company name");
    fireEvent.change(input, { target: { value: "Acme Updated" } });
    await click("Save registry");
    await waitFor(() => expect(net.count("PATCH /api/v1/platform/companies/{publicId}")).toBe(1));
    const call = net.calls.find((call) => call.key.startsWith("PATCH"));
    expect(call?.input).toEqual({
      params: { publicId: companyIds.company },
      body: {
        name: "Acme Updated",
      },
    });
    expect(screen.queryByLabelText("isActive")).toBeNull();
  });
  it.each([
    ["Freeze", "freeze", "ACTIVE", false],
    ["Unfreeze", "unfreeze", "ACTIVE", true],
    ["Suspend", "suspend", "ACTIVE", false],
    ["Unsuspend", "unsuspend", "SUSPENDED", false],
  ] as const)("confirms %s and sends exactly one bodyless transition", async (name, command, status, frozen) => {
    const { net } = open({ status, frozen });
    const key = `POST /api/v1/platform/companies/{publicId}/${command}`;
    net.on(key, () => ({ status: 204 }));
    await click(name);
    expect(net.count(key)).toBe(0);
    await confirm(name);
    expect(await screen.findByRole("status")).toHaveTextContent("Command confirmed");
    expect(net.calls.find((call) => call.key === key)?.input).toEqual({
      params: { publicId: companyIds.company },
      body: {},
    });
    expect(net.count(key)).toBe(1);
  });
  it("activation GET is pure and evaluation requires explicit confirmation", async () => {
    const { net } = open({ status: "ONBOARDING", ready: true });
    const key = "POST /api/v1/platform/companies/{publicId}/activation/evaluate";
    net.on(key, () => ({ status: 200, body: companyActivationBody() }));
    await screen.findByText(/Ready for activation/);
    expect(net.count(key)).toBe(0);
    await click("Re-evaluate and activate");
    expect(net.count(key)).toBe(0);
    await confirm("Re-evaluate and activate");
    await waitFor(() => expect(net.count(key)).toBe(1));
    expect(net.calls.find((call) => call.key === key)?.input).toEqual({
      params: { publicId: companyIds.company },
    });
  });
  it("deletes with typed target confirmation and restores through its dedicated command", async () => {
    const { net } = open();
    net.on("DELETE /api/v1/platform/companies/{publicId}", () => ({ status: 204 }));
    net.on("POST /api/v1/platform/companies/{publicId}/restore", () => ({ status: 204 }));
    await click("Delete Company");
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("button", { name: "Delete Company" })).toBeDisabled();
    fireEvent.change(within(dialog).getByRole("textbox"), { target: { value: "Acme Company" } });
    await confirm("Delete Company");
    await click("Restore");
    await confirm("Restore");
    await waitFor(() =>
      expect(net.count("POST /api/v1/platform/companies/{publicId}/restore")).toBe(1),
    );
  });
  it("policy and trial update use separate generated payloads and confirmations", async () => {
    const { net } = open();
    net.on("PATCH /api/v1/platform/companies/{publicId}/access-policy", () => ({
      status: 200,
      body: companyPolicyBody("MAINTENANCE").policy,
    }));
    net.on("PATCH /api/v1/platform/companies/{publicId}/subscription/trial", () => ({
      status: 200,
      body: companySubscriptionBody(),
    }));
    await screen.findByLabelText("Configured access mode");
    fireEvent.change(screen.getByLabelText("Configured access mode"), {
      target: { value: "MAINTENANCE" },
    });
    fireEvent.change(screen.getByLabelText("Effective from"), {
      target: { value: "2026-10-01T10:00" },
    });
    fireEvent.change(screen.getByLabelText("Reason", { selector: "#updatePolicy-reason" }), {
      target: { value: "Maintenance window" },
    });
    await click("Change access policy");
    await confirm("Change access policy");
    await waitFor(() =>
      expect(net.count("PATCH /api/v1/platform/companies/{publicId}/access-policy")).toBe(1),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    fireEvent.change(screen.getByLabelText("Trial end"), { target: { value: "2026-11-01T10:00" } });
    fireEvent.change(screen.getByLabelText("Reason", { selector: "#extendTrial-reason" }), {
      target: { value: "Support extension" },
    });
    await click("Extend trial");
    await confirm("Extend trial");
    await waitFor(() =>
      expect(net.count("PATCH /api/v1/platform/companies/{publicId}/subscription/trial")).toBe(1),
    );
  });
  it.each([
    403, 409, 429, 500,
  ])("reconciles %i without retry or raw error disclosure", async (status) => {
    const { net } = open();
    const key = "POST /api/v1/platform/companies/{publicId}/suspend";
    net.on(key, () => ({ status, body: problemBody(status) }));
    await click("Suspend");
    await confirm("Suspend");
    await screen.findByRole("alert");
    await waitFor(() =>
      expect(net.count("GET /api/v1/platform/companies/{publicId}")).toBeGreaterThan(1),
    );
    expect(net.count(key)).toBe(1);
    expect(screen.queryByText(/canary/)).toBeNull();
    expect(screen.getByRole("button", { name: "Suspend" })).toBeDisabled();
    if (status === 403 || status === 409) expect(net.count("GET /api/v1/platform/me")).toBe(1);
  });
  it("hides operations and their reads without permissions", async () => {
    const { net } = open({ permissions: ["companies:read"] });
    await screen.findByText("Registry isActive (read-only)");
    expect(screen.queryByRole("button", { name: "Save registry" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Suspend" })).toBeNull();
    expect(net.calls.map((call) => call.key)).toEqual([
      "GET /api/v1/platform/companies/{publicId}",
    ]);
  });
  it("opens a support session only with a closed reason and navigates to its workspace", async () => {
    const { net } = open({ permissions: [...companyPermissions, "delegation:open"] });
    const key = "POST /api/v1/platform/access-sessions";
    const sessionPublicId = "3f0f7a52-5d5b-4b8e-9d7e-7c3e8b1f2a10";
    net.on(key, () => ({
      status: 201,
      body: {
        publicId: sessionPublicId,
        companyPublicId: companyIds.company,
        reason: "INCIDENT_RESPONSE",
        status: "OPEN",
        openedAt: "2026-09-27T09:00:00.000Z",
        expiresAt: "2026-09-27T10:00:00.000Z",
        closedAt: null,
      },
    }));
    navigations.length = 0;
    await click("Open support session");
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("button", { name: "Open session" })).toBeDisabled();
    fireEvent.click(within(dialog).getByRole("combobox", { name: "Reason" }));
    fireEvent.click(await screen.findByRole("option", { name: "Incident response" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Open session" }));
    await waitFor(() => expect(navigations).toHaveLength(1));
    expect(net.calls.find((call) => call.key === key)?.input).toEqual({
      body: { companyPublicId: companyIds.company, reason: "INCIDENT_RESPONSE" },
    });
    expect(navigations[0]).toEqual({
      to: "/platform/access-sessions/$sessionPublicId",
      params: { sessionPublicId },
    });
  });
  it("reports an unconfirmed support session without retrying", async () => {
    const { net } = open({ permissions: [...companyPermissions, "delegation:open"] });
    const key = "POST /api/v1/platform/access-sessions";
    net.on(key, () => ({ status: 500, body: problemBody(500) }));
    await click("Open support session");
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("combobox", { name: "Reason" }));
    fireEvent.click(await screen.findByRole("option", { name: "Support request" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Open session" }));
    expect(await screen.findByText(/The outcome could not be confirmed/)).toBeInTheDocument();
    expect(net.count(key)).toBe(1);
    expect(screen.queryByText(/canary/)).toBeNull();
  });
  it("hides the support session entry without delegation:open", async () => {
    open();
    await screen.findByText("Registry isActive (read-only)");
    expect(screen.queryByRole("button", { name: "Open support session" })).toBeNull();
  });
});
