import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { platformLeadOperations as operations } from "@/shared/api";
import { usePlatformSession } from "@/shared/auth";
import { platformSessionFixture } from "../../../../test/audience-fixtures";
import { problemBody } from "../../../../test/operation-fakes";
import { operationNetwork } from "../../../../test/operation-request-mock";
import {
  approvedBody,
  conversionBody,
  deliveryBody,
  leadIds,
  leadPermissions,
  plansBody,
} from "../../../../test/platform-lead-fixtures";
import { navigations } from "../../../../test/router-mock";
import { PlatformConversionRequestDetailPage } from "./crm-request-detail-page";

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
function open(body = conversionBody(), permissions = leadPermissions) {
  const net = operationNetwork.install();
  usePlatformSession.getState().setSession(platformSessionFixture({ permissions }));
  net.on(operations.request.key, () => ({ status: 200, body }));
  net.on(operations.delivery.key, () => ({ status: 200, body: deliveryBody() }));
  net.on(operations.plans.key, () => ({ status: 200, body: plansBody() }));
  render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
        })
      }
    >
      <PlatformConversionRequestDetailPage publicId={leadIds.request} />
    </QueryClientProvider>,
  );
  return net;
}
afterEach(() => {
  cleanup();
  usePlatformSession.getState().clearSession();
  navigations.length = 0;
});
describe("Request inspection and delivery", () => {
  it("request read alone permits inspection without approval controls or plan discovery", async () => {
    const net = open(conversionBody(), ["lead-conversion-requests:read"]);
    await screen.findByRole("heading", { name: "Acme Lead" });
    expect(screen.getByText("Not available in this projection")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Approve conversion" })).toBeNull();
    expect(net.count(operations.plans.key)).toBe(0);
  });
  it("confirms approval and preserves setup without exposing provisioning credentials", async () => {
    const net = open();
    net.on(operations.approve.key, () => ({ status: 200, body: approvedBody() }));
    const approve = await screen.findByRole("button", { name: "Approve conversion" });
    fireEvent.click(approve);
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Approve conversion" }));
    await waitFor(() => expect(net.count(operations.approve.key)).toBe(1));
    expect(net.calls.find((call) => call.key === operations.approve.key)?.input).toEqual({
      params: { publicId: leadIds.request },
      body: { templateKey: 1 },
    });
    expect(document.body.textContent).not.toMatch(/canary/);
  });
  it("displays delivery status independently and retries only the original record", async () => {
    const net = open(approvedBody());
    net.on(operations.retryDelivery.key, () => ({
      status: 200,
      body: deliveryBody({ status: "PENDING" }),
    }));
    const retry = await screen.findByRole("button", { name: "Retry original delivery" });
    fireEvent.click(retry);
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Retry original delivery" }));
    await waitFor(() => expect(net.count(operations.retryDelivery.key)).toBe(1));
    expect(net.calls.find((call) => call.key === operations.retryDelivery.key)?.input).toEqual({
      params: { publicId: leadIds.request },
    });
    expect(screen.queryByLabelText(/recipient|password/i)).toBeNull();
    expect(document.body.textContent).not.toMatch(/canary/);
  });
  it("does not fall back to an embedded retryable delivery after its inspection fails", async () => {
    const net = open(approvedBody());
    net.on(operations.delivery.key, () => ({ status: 403, body: problemBody(403) }));
    await screen.findByText("This section is unavailable with your current access.");
    expect(screen.queryByRole("button", { name: "Retry original delivery" })).toBeNull();
    expect(document.body.textContent).not.toMatch(/canary/);
  });
  it.each([
    "PENDING",
    "SUCCEEDED",
    "EXHAUSTED",
  ])("%s delivery is inspectable but cannot be retried", async (status) => {
    const delivery = deliveryBody({ status });
    const net = open(approvedBody({ ownerOnboardingDelivery: delivery }));
    net.on(operations.delivery.key, () => ({ status: 200, body: delivery }));
    expect(await screen.findByRole("button", { name: "Retry original delivery" })).toBeDisabled();
  });
});
