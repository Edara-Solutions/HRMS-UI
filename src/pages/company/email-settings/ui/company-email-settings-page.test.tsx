import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useCompanySession } from "@/shared/auth";
import { companySessionFixture } from "../../../../test/audience-fixtures";
import {
  communicationsCanaries,
  emailSettingsBody,
  sendingDomainBody,
} from "../../../../test/company-communications-fixtures";
import { accessPolicyBody } from "../../../../test/company-organization-fixtures";
import { problemBody } from "../../../../test/operation-fakes";
import { operationNetwork } from "../../../../test/operation-request-mock";
import "../../../../test/router-mock";
import { CompanyEmailSettingsPage } from "./company-email-settings-page";

const manager = [
  "companies:email-settings:read",
  "companies:email-settings:update",
  "companies:email-readiness:read",
  "sending-domains:read",
  "sending-domains:manage",
  "email-types:read",
  "company-access-policies:read",
];

type DomainReply = { status: number; body?: unknown };

function renderSettings({
  domain = { status: 404, body: problemBody(404) } as DomainReply,
  readiness = { ready: false, reason: "NOT_PROVISIONED" } as Record<string, unknown>,
  permissions = manager,
  mode = "NORMAL",
} = {}) {
  const net = operationNetwork.install();
  net.on("GET /api/v1/company/email-settings", () => ({ status: 200, body: emailSettingsBody() }));
  net.on("GET /api/v1/company/email-readiness", () => ({ status: 200, body: readiness }));
  net.on("GET /api/v1/company/sending-domain", () => domain);
  net.on("GET /api/v1/company/sending-domain/readiness", () => ({ status: 200, body: readiness }));
  net.on("GET /api/v1/company/access-policy", () => ({
    status: 200,
    body: accessPolicyBody(mode),
  }));
  useCompanySession.getState().setSession(companySessionFixture({ permissions }));
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <CompanyEmailSettingsPage />
    </QueryClientProvider>,
  );
  return net;
}

function domainCard() {
  return screen.getByRole("region", { name: "Sending domain" });
}

afterEach(() => {
  cleanup();
  useCompanySession.getState().clearSession();
});

describe("Company sending domain states", () => {
  it("distinguishes a domain that is not configured and creates one by name only", async () => {
    const net = renderSettings();
    net.on("POST /api/v1/company/sending-domain", () => {
      // The server now holds the domain, so the reconciling read returns it too.
      net.on("GET /api/v1/company/sending-domain", () => ({
        status: 200,
        body: sendingDomainBody("PENDING"),
      }));
      return { status: 201, body: sendingDomainBody("PENDING") };
    });
    expect(await within(domainCard()).findByText("Not configured")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Domain"), { target: { value: "Mail.Edara.test" } });
    fireEvent.click(screen.getByRole("button", { name: "Add domain" }));
    expect(await within(domainCard()).findByText("DNS pending")).toBeInTheDocument();
    expect(
      net.calls.find((call) => call.key === "POST /api/v1/company/sending-domain")?.input,
    ).toEqual({
      body: { domain: "mail.edara.test" },
    });
  });

  it.each([
    [
      { status: 200, body: sendingDomainBody("PENDING") },
      { ready: false, reason: "NOT_VERIFIED" },
      "DNS pending",
    ],
    [
      { status: 200, body: sendingDomainBody("FAILED") },
      { ready: false, reason: "NOT_VERIFIED" },
      "Verification failed",
    ],
    [
      { status: 200, body: sendingDomainBody("VERIFIED") },
      { ready: false, reason: "STALE" },
      "DNS out of date",
    ],
    [{ status: 200, body: sendingDomainBody("VERIFIED") }, { ready: true }, "Ready"],
  ])("shows %# as its own state without backend failure text", async (domain, readiness, label) => {
    renderSettings({ domain, readiness });
    expect(await within(domainCard()).findByText(label)).toBeInTheDocument();
    for (const canary of [...communicationsCanaries, "record-description-canary"])
      expect(document.body.textContent).not.toContain(canary);
  });

  it("confirms a DNS check, sends an empty body and never retries it", async () => {
    const net = renderSettings({ domain: { status: 200, body: sendingDomainBody("PENDING") } });
    net.on("POST /api/v1/company/sending-domain/verify", () => ({
      status: 409,
      body: problemBody(409),
    }));
    fireEvent.click(await within(domainCard()).findByRole("button", { name: "Check DNS now" }));
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("Checking never changes who owns the domain.");
    fireEvent.click(within(dialog).getByRole("button", { name: "Check DNS now" }));
    expect(
      await screen.findByText(
        "This changed since you opened it. It has been refreshed; review it before trying again.",
      ),
    ).toBeInTheDocument();
    expect(net.calls.filter((call) => call.key.endsWith("/verify"))).toEqual([
      { audience: "company", key: "POST /api/v1/company/sending-domain/verify", input: {} },
    ]);
    await waitFor(() => expect(net.count("GET /api/v1/company/sending-domain")).toBe(2));
  });
});

describe("Company sender settings", () => {
  it("replaces the settings as a whole through the generated operation", async () => {
    const net = renderSettings();
    net.on("PUT /api/v1/company/email-settings", () => ({
      status: 200,
      body: emailSettingsBody({ displayName: "Edara HR" }),
    }));
    const name = await screen.findByLabelText("Sender name");
    await waitFor(() => expect(name).toBeEnabled());
    fireEvent.change(name, { target: { value: "Edara HR" } });
    fireEvent.click(screen.getByRole("button", { name: "Save settings" }));
    expect(await screen.findByText("Email settings saved.")).toBeInTheDocument();
    const {
      sendingDomain: _domain,
      senderVerified: _verified,
      ...body
    } = emailSettingsBody({
      displayName: "Edara HR",
    });
    expect(net.calls.find((call) => call.key.startsWith("PUT"))?.input).toEqual({ body });
  });

  it.each([
    "READ_ONLY",
    "FROZEN",
    "MAINTENANCE",
  ])("keeps settings readable but locked in %s", async (mode) => {
    renderSettings({ mode });
    const name = await screen.findByLabelText("Sender name");
    await waitFor(() => expect(name).toBeDisabled());
    expect(screen.queryByRole("button", { name: "Save settings" })).toBeNull();
  });

  it("shows read-only settings and no domain commands without manage permissions", async () => {
    renderSettings({
      permissions: ["companies:email-settings:read", "sending-domains:read"],
    });
    expect(await screen.findByText("Edara Labs")).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Sender name" })).toBeNull();
    expect(await within(domainCard()).findByText("Not configured")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add domain" })).toBeNull();
  });
});
