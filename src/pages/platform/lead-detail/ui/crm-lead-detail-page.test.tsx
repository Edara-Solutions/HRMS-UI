import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { platformLeadOperations as operations } from "@/shared/api";
import { usePlatformSession } from "@/shared/auth";
import { platformSessionFixture } from "../../../../test/audience-fixtures";
import { problemBody } from "../../../../test/operation-fakes";
import { operationNetwork } from "../../../../test/operation-request-mock";
import {
  activityBody,
  contactBody,
  conversionBody,
  domainBody,
  eligibilityBody,
  leadDetailBody,
  leadIds,
  leadPermissions,
  pageMeta,
  plansBody,
} from "../../../../test/platform-lead-fixtures";
import { navigations } from "../../../../test/router-mock";
import { PlatformLeadDetailPage } from "./crm-lead-detail-page";

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
function open(permissions = leadPermissions, detail = leadDetailBody()) {
  const net = operationNetwork.install();
  usePlatformSession.getState().setSession(platformSessionFixture({ permissions }));
  net.on(operations.lead.key, () => ({ status: 200, body: detail }));
  net.on(operations.eligibility.key, () => ({ status: 200, body: eligibilityBody() }));
  net.on(operations.activities.key, () => ({
    status: 200,
    body: { items: [activityBody()], meta: pageMeta() },
  }));
  net.on(operations.domain.key, () => ({ status: 200, body: domainBody() }));
  net.on(operations.readiness.key, () => ({
    status: 200,
    body: { ready: false, reason: "NOT_VERIFIED" },
  }));
  net.on(operations.plans.key, () => ({ status: 200, body: plansBody() }));
  render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
        })
      }
    >
      <PlatformLeadDetailPage publicId={leadIds.lead} activityPage={1} />
    </QueryClientProvider>,
  );
  return net;
}
afterEach(() => {
  cleanup();
  usePlatformSession.getState().clearSession();
  navigations.length = 0;
});
describe("Platform lead workspace", () => {
  it("shows scoped DNS records and contact activity without provider disclosure", async () => {
    open();
    expect(await screen.findByText("verify-acme")).toBeInTheDocument();
    expect(await screen.findByText("Requested a demo")).toBeInTheDocument();
    expect(screen.getByText("Intended Owner", { exact: false })).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/canary/);
    const ids = Array.from(document.querySelectorAll("[id]"), (node) => node.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("read-only actors inspect the lead without write or conversion controls", async () => {
    const net = open(["leads:read"]);
    await screen.findByText("Requested a demo");
    expect(screen.queryByRole("button", { name: "Save changes" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Convert immediately" })).toBeNull();
    expect(screen.queryByText("Sending domain")).toBeNull();
    expect(
      net.calls.every((call) => call.key.startsWith("GET") && !call.key.includes("sending-domain")),
    ).toBe(true);
  });
  it("confirms a contact change and invalidates eligibility once", async () => {
    const net = open();
    net.on(operations.updateContact.key, () => ({ status: 200, body: contactBody() }));
    await screen.findByText("Requested a demo");
    const summary = screen.getByText("Save contact", { selector: "summary" });
    fireEvent.click(summary);
    const form = summary.parentElement?.querySelector("form");
    if (!form) throw new Error("Contact form missing");
    fireEvent.change(within(form).getByLabelText("Contact name"), {
      target: { value: "Updated owner" },
    });
    fireEvent.click(within(form).getByRole("button", { name: "Save contact" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Save contact" }));
    await waitFor(() => expect(net.count(operations.updateContact.key)).toBe(1));
    expect(net.calls.find((call) => call.key === operations.updateContact.key)?.input).toEqual({
      params: { publicId: leadIds.lead, contactPublicId: leadIds.contact },
      body: { name: "Updated owner" },
    });
    await waitFor(() => expect(net.count(operations.eligibility.key)).toBeGreaterThan(1));
  });
  it("reconciles a failed immediate conversion to a page-two request and never resubmits", async () => {
    const net = open();
    net.on(operations.immediate.key, () => ({ status: 500, body: problemBody(500) }));
    net.on(operations.requests.key, (input) => {
      const query = operations.requests.parseRequest(input).query;
      return {
        status: 200,
        body: { items: query.page === 2 ? [conversionBody()] : [], meta: pageMeta(query.page, 2) },
      };
    });
    const convert = await screen.findByRole("button", { name: "Convert immediately" });
    await waitFor(() => expect(convert).toBeEnabled());
    fireEvent.click(convert);
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Convert immediately" }));
    expect(await screen.findByRole("link", { name: "Inspect original request" })).toHaveAttribute(
      "href",
      `/platform/conversion-requests/${leadIds.request}`,
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.getByRole("button", { name: "Convert immediately" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Request conversion" })).toBeDisabled();
    expect(net.count(operations.immediate.key)).toBe(1);
    expect(document.body.textContent).not.toMatch(/canary/);
  });
  it("shows no missing-domain provisioning assumption after a refused read", async () => {
    const net = open();
    net.on(operations.domain.key, () => ({ status: 403, body: problemBody(403) }));
    expect(
      await screen.findByText("This section is unavailable with your current access."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Provision domain" })).toBeNull();
    expect(screen.queryByText("No sending domain is provisioned.")).toBeNull();
  });
});
