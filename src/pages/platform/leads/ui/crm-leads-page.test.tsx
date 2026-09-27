import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { platformLeadOperations as operations } from "@/shared/api";
import { usePlatformSession } from "@/shared/auth";
import { platformSessionFixture } from "../../../../test/audience-fixtures";
import { problemBody } from "../../../../test/operation-fakes";
import { operationNetwork } from "../../../../test/operation-request-mock";
import {
  contactBody,
  leadBody,
  leadIds,
  leadListBody,
  leadPermissions,
  pageMeta,
} from "../../../../test/platform-lead-fixtures";
import { navigations } from "../../../../test/router-mock";
import { PlatformLeadsPage } from "./crm-leads-page";

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
function open(reply: unknown = leadListBody(), status = 200, permissions = leadPermissions) {
  const net = operationNetwork.install();
  usePlatformSession.getState().setSession(platformSessionFixture({ permissions }));
  net.on(operations.leads.key, () => ({ status, body: reply }));
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <PlatformLeadsPage search={{ page: 1, pageSize: 10, isArchived: false }} />
    </QueryClientProvider>,
  );
  return net;
}
afterEach(() => {
  cleanup();
  usePlatformSession.getState().clearSession();
  navigations.length = 0;
});
describe("Lead registry", () => {
  it("reads the generated wrapped items and persists filters through page navigation", async () => {
    const net = open();
    await screen.findByRole("link", { name: "Acme Lead" });
    expect(net.calls[0]).toMatchObject({
      audience: "platform",
      input: { query: { page: 1, pageSize: 10, isArchived: false } },
    });
    fireEvent.change(screen.getByLabelText("Status", { exact: true }), {
      target: { value: "QUALIFIED" },
    });
    expect(navigations.at(-1)).toMatchObject({
      to: "/platform/leads",
      search: { status: "QUALIFIED", page: 1 },
    });
  });
  it("creates safe registry fields and a validated nested primary contact", async () => {
    const net = open();
    net.on(operations.create.key, () => ({
      status: 201,
      body: { lead: leadBody(), contacts: [contactBody()], meta: { duplicate: false } },
    }));
    await screen.findByRole("link", { name: "Acme Lead" });
    fireEvent.click(screen.getByRole("button", { name: "Create lead" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Company name"), {
      target: { value: "New Lead" },
    });
    fireEvent.change(within(dialog).getByLabelText("Contact name"), { target: { value: "Owner" } });
    fireEvent.change(within(dialog).getByLabelText("Contact email"), {
      target: { value: "invalid" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Create lead" }));
    expect(net.count(operations.create.key)).toBe(0);
    expect(within(dialog).getByRole("alert")).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText("Contact email"), {
      target: { value: "owner@example.test" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Create lead" }));
    await waitFor(() => expect(net.count(operations.create.key)).toBe(1));
    expect(net.calls.find((call) => call.key === operations.create.key)?.input).toEqual({
      body: {
        companyName: "New Lead",
        companySizeRange: "5_TO_20",
        source: "CRM",
        status: "NEW",
        primaryContact: { name: "Owner", email: "owner@example.test" },
      },
    });
    await waitFor(() =>
      expect(navigations.at(-1)).toMatchObject({
        to: "/platform/leads/$publicId",
        params: { publicId: leadIds.lead },
      }),
    );
  });
  it("renders empty records without inventing conversion actions", async () => {
    open({ items: [], meta: pageMeta() });
    expect(await screen.findByText("No records found.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Convert immediately" })).toBeNull();
  });
  it.each([
    403, 429, 500,
  ])("bounds a %s list failure without server diagnostics", async (status) => {
    open(problemBody(status), status);
    await screen.findByRole("alert");
    expect(document.body.textContent).not.toMatch(/canary/);
    expect(screen.getByRole("button", { name: "Create lead" })).toBeDisabled();
  });
  it("does not retry a malformed response or offer writes", async () => {
    const net = open({ data: [] });
    await screen.findByText("The response could not be verified. This section is unavailable.");
    expect(screen.queryByRole("button", { name: "Retry read" })).toBeNull();
    expect(net.count(operations.leads.key)).toBe(1);
  });
});
