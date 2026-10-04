import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { platformPlanOperations as operations } from "@/shared/api";
import { usePlatformSession } from "@/shared/auth";
import { platformSessionFixture } from "../../../../test/audience-fixtures";
import { problemBody } from "../../../../test/operation-fakes";
import { operationNetwork } from "../../../../test/operation-request-mock";
import {
  catalogueInstant,
  effectiveBody,
  planBody,
  planDetailBody,
  planId,
  planPermissions,
  priceBody,
  priceId,
} from "../../../../test/platform-plan-fixtures";
import { navigations } from "../../../../test/router-mock";
import { PlatformPlanDetailPage } from "./plan-detail-page";
import { PlatformPlansPage } from "./platform-plans-page";

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
function open(detail = true, permissions = planPermissions, body: unknown = planDetailBody()) {
  const net = operationNetwork.install();
  usePlatformSession.getState().setSession(platformSessionFixture({ permissions }));
  net.on("GET /api/v1/platform/me", () => ({
    status: 200,
    body: platformSessionFixture({ permissions }).user,
  }));
  net.on(operations.plans.key, () => ({ status: 200, body: { data: [planDetailBody()] } }));
  net.on(operations.plan.key, () => ({ status: 200, body }));
  net.on(operations.prices.key, () => ({ status: 200, body: { data: [priceBody()] } }));
  net.on(operations.price.key, () => ({ status: 200, body: priceBody() }));
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      {detail ? (
        <PlatformPlanDetailPage publicId={planId} search={{}} />
      ) : (
        <PlatformPlansPage search={{}} />
      )}
    </QueryClientProvider>,
  );
  return net;
}
afterEach(() => {
  cleanup();
  usePlatformSession.getState().clearSession();
  navigations.length = 0;
});
describe("Platform catalogue", () => {
  it("shows the authored features, limits and direct edit action in the catalogue", async () => {
    open(false);
    expect((await screen.findAllByText("Overview")).length).toBeGreaterThan(0);
    expect(screen.getByRole("columnheader", { name: "Limits" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Updated" })).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "Edit plan" })[0]);
    expect(await screen.findByRole("dialog", { name: "Edit plan" })).toBeInTheDocument();
  });
  it("owns identity/resource keys and reads without guessing a market", async () => {
    const net = open();
    await screen.findByRole("heading", { name: "Growth خطة" });
    expect(net.calls[0]).toMatchObject({
      audience: "platform",
      input: { params: { publicId: planId }, query: {} },
    });
    expect(net.count(operations.effective.key)).toBe(0);
    expect(screen.getByText("Authored description وصف")).toHaveAttribute("dir", "auto");
    expect(screen.queryByText(catalogueInstant)).not.toBeInTheDocument();
  });
  it("creates definitions using generated validation and nested limits", async () => {
    const net = open(false);
    net.on(operations.create.key, () => ({ status: 201, body: planBody() }));
    await screen.findAllByRole("link", { name: "Growth خطة" });
    fireEvent.click(screen.getByRole("button", { name: "Create plan" }));
    const dialog = within(await screen.findByRole("dialog"));
    fireEvent.click(dialog.getByRole("button", { name: "Create plan" }));
    expect(net.count(operations.create.key)).toBe(0);
    fireEvent.change(dialog.getByLabelText("Name"), { target: { value: "New plan" } });
    fireEvent.click(dialog.getByRole("button", { name: "Overview" }));
    fireEvent.click(dialog.getByRole("button", { name: "Attendance" }));
    fireEvent.click(dialog.getByRole("button", { name: "Analytics" }));
    fireEvent.change(dialog.getByLabelText("Maximum users"), { target: { value: "50" } });
    fireEvent.click(dialog.getByRole("button", { name: "Create plan" }));
    await waitFor(() => expect(net.count(operations.create.key)).toBe(1));
    expect(net.calls.find((call) => call.key === operations.create.key)?.input).toMatchObject({
      body: {
        name: "New plan",
        duration: 30,
        features: ["ATTENDANCE", "ANALYTICS"],
        limits: { MAX_USERS: 50 },
      },
    });
  });
  it("updates only changed fields after a fresh definition read", async () => {
    const net = open();
    net.on(operations.update.key, () => ({
      status: 200,
      body: planBody({ description: "Changed" }),
    }));
    await screen.findByRole("heading", { name: "Growth خطة" });
    fireEvent.click(screen.getByRole("button", { name: "Edit plan" }));
    const dialog = within(await screen.findByRole("dialog"));
    fireEvent.change(dialog.getByLabelText("Description"), { target: { value: "Changed" } });
    fireEvent.click(dialog.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(net.count(operations.update.key)).toBe(1));
    expect(net.calls.find((call) => call.key === operations.update.key)?.input).toEqual({
      params: { publicId: planId },
      body: { description: "Changed" },
    });
    expect(net.count(operations.plan.key)).toBeGreaterThan(1);
  });
  it("preserves backend-only features while editing other plan fields", async () => {
    const net = open(
      true,
      planPermissions,
      planDetailBody({ features: ["OVERVIEW", "BACKEND_ONLY"] }),
    );
    net.on(operations.update.key, () => ({
      status: 200,
      body: planBody({ description: "Changed" }),
    }));
    await screen.findByRole("heading", { name: "Growth خطة" });
    fireEvent.click(screen.getByRole("button", { name: "Edit plan" }));
    const dialog = within(await screen.findByRole("dialog"));
    expect(dialog.getByRole("button", { name: "Overview" })).toBeDisabled();
    expect(dialog.getByText(/BACKEND_ONLY/)).toBeInTheDocument();
    fireEvent.change(dialog.getByLabelText("Description"), { target: { value: "Changed" } });
    fireEvent.click(dialog.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(net.count(operations.update.key)).toBe(1));
    expect(net.calls.find((call) => call.key === operations.update.key)?.input).toEqual({
      params: { publicId: planId },
      body: { description: "Changed" },
    });
  });
  it("does not overwrite a concurrent definition edit", async () => {
    const net = open();
    await screen.findByRole("heading", { name: "Growth خطة" });
    fireEvent.click(screen.getByRole("button", { name: "Edit plan" }));
    net.on(operations.plan.key, () => ({
      status: 200,
      body: planDetailBody({ updatedAt: "2026-09-21T10:00:00.000Z" }),
    }));
    const dialog = within(await screen.findByRole("dialog"));
    fireEvent.change(dialog.getByLabelText("Name"), { target: { value: "Changed" } });
    fireEvent.click(dialog.getByRole("button", { name: "Save" }));
    await dialog.findByText(/catalogue changed/);
    expect(net.count(operations.update.key)).toBe(0);
    expect(dialog.getByRole("button", { name: "Save" })).toBeDisabled();
  });
  it("requires explicit currency and interval for effective inspection", async () => {
    const net = open();
    await screen.findByRole("heading", { name: "Growth خطة" });
    fireEvent.click(screen.getByRole("button", { name: "Inspect price" }));
    expect(net.count(operations.effective.key)).toBe(0);
    fireEvent.change(screen.getByLabelText("Currency code"), { target: { value: "USD" } });
    fireEvent.click(screen.getByRole("button", { name: "Inspect price" }));
    expect(navigations.at(-1)).toMatchObject({
      search: { currencyCode: "USD", billingInterval: "monthly" },
    });
  });
  it("creates, reads and updates prices in minor units without conversion", async () => {
    const net = open();
    net.on(operations.createPrice.key, () => ({ status: 201, body: priceBody() }));
    net.on(operations.updatePrice.key, () => ({ status: 200, body: priceBody() }));
    await screen.findByRole("button", { name: "Edit price" });
    fireEvent.click(screen.getByRole("button", { name: "Add price" }));
    let dialog = within(await screen.findByRole("dialog"));
    fireEvent.change(dialog.getByLabelText("Currency code"), { target: { value: "JPY" } });
    fireEvent.change(dialog.getByLabelText("Amount in minor currency units"), {
      target: { value: "123" },
    });
    fireEvent.click(dialog.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(net.count(operations.createPrice.key)).toBe(1));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Edit price" }));
    dialog = within(await screen.findByRole("dialog"));
    fireEvent.change(dialog.getByLabelText("Amount in minor currency units"), {
      target: { value: "7600" },
    });
    fireEvent.click(dialog.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(net.count(operations.updatePrice.key)).toBe(1));
    expect(net.calls.find((call) => call.key === operations.updatePrice.key)?.input).toEqual({
      params: { publicId: priceId },
      body: { amountMinor: 7600 },
    });
    expect(net.count(operations.price.key)).toBe(1);
  });
  for (const status of [400, 403, 409, 429, 500])
    it(`blocks ${status} mutation outcomes and never leaks raw problems`, async () => {
      const net = open();
      net.on(operations.removePrice.key, () => ({ status, body: problemBody(status) }));
      await screen.findByRole("button", { name: "Delete price" });
      fireEvent.click(screen.getByRole("button", { name: "Delete price" }));
      fireEvent.click(
        within(await screen.findByRole("dialog")).getByRole("button", { name: "Confirm deletion" }),
      );
      await screen.findByRole("alert");
      expect(net.count(operations.removePrice.key)).toBe(1);
      expect(screen.getByRole("button", { name: "Delete price" })).toBeDisabled();
      expect(document.body.textContent).not.toContain("canary");
      expect(net.count(operations.prices.key)).toBeGreaterThan(1);
    });
  it("confirms and deletes a plan with declared 200 success", async () => {
    const net = open();
    net.on(operations.remove.key, () => ({
      status: 200,
      body: { message: "private-message-canary" },
    }));
    await screen.findByRole("heading", { name: "Growth خطة" });
    fireEvent.click(screen.getByRole("button", { name: "Delete plan" }));
    fireEvent.click(
      within(await screen.findByRole("dialog")).getByRole("button", { name: "Confirm deletion" }),
    );
    await waitFor(() => expect(net.count(operations.remove.key)).toBe(1));
    expect(document.body.textContent).not.toContain("canary");
    expect(navigations.at(-1)).toMatchObject({ to: "/platform/plans" });
  });
  it("hides writes for a read-only operator", async () => {
    open(true, ["plans:read"]);
    await screen.findByRole("heading", { name: "Growth خطة" });
    expect(screen.queryByRole("button", { name: "Edit plan" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add price" })).not.toBeInTheDocument();
  });
  it("locks system default name, publication and deletion", async () => {
    open(true, planPermissions, planDetailBody({ name: "Default Full Access" }));
    await screen.findByRole("heading", { name: "Default Full Access" });
    expect(screen.getByRole("button", { name: "Delete plan" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Edit plan" }));
    const dialog = within(await screen.findByRole("dialog"));
    expect(dialog.getByLabelText("Name")).toBeDisabled();
    expect(dialog.getByRole("button", { name: "Published" })).toBeDisabled();
  });
  for (const body of [
    { ...planDetailBody(), publicId: priceId },
    { ...planDetailBody(), secret: "hidden-canary" },
  ])
    it("conceals malformed or foreign resource contracts", async () => {
      open(true, planPermissions, body);
      await screen.findByRole("alert");
      expect(screen.queryByRole("heading", { name: "Growth خطة" })).not.toBeInTheDocument();
      expect(document.body.textContent).not.toContain("canary");
    });
  it("checks effective response target and cache inputs", () => {
    expect(operations.effective.responses["200"].safeParse(effectiveBody()).success).toBe(true);
  });
  it("does not repeat an offline create and retains input for review", async () => {
    const net = open(false);
    net.on(operations.create.key, () => {
      throw new TypeError("offline-canary");
    });
    await screen.findAllByRole("link", { name: "Growth خطة" });
    fireEvent.click(screen.getByRole("button", { name: "Create plan" }));
    const dialog = within(await screen.findByRole("dialog"));
    fireEvent.change(dialog.getByLabelText("Name"), { target: { value: "New plan" } });
    fireEvent.click(dialog.getByRole("button", { name: "Create plan" }));
    await dialog.findByRole("alert");
    expect(dialog.getByLabelText("Name")).toHaveValue("New plan");
    expect(dialog.getByRole("button", { name: "Create plan" })).toBeDisabled();
    expect(net.count(operations.create.key)).toBe(1);
    expect(document.body.textContent).not.toContain("canary");
  });
  it("marks only declared field paths without displaying arbitrary error text", async () => {
    const net = open(false);
    net.on(operations.create.key, () => ({
      status: 400,
      body: problemBody(400, { invalidParams: ["name", "secret-canary"] }),
    }));
    await screen.findAllByRole("link", { name: "Growth خطة" });
    fireEvent.click(screen.getByRole("button", { name: "Create plan" }));
    const dialog = within(await screen.findByRole("dialog"));
    fireEvent.change(dialog.getByLabelText("Name"), { target: { value: "New plan" } });
    fireEvent.click(dialog.getByRole("button", { name: "Create plan" }));
    await dialog.findByRole("alert");
    expect(dialog.getByLabelText("Name")).toHaveAttribute("aria-invalid", "true");
    expect(document.body.textContent).not.toContain("canary");
  });
  it("rechecks price membership and refuses stale or foreign rows", async () => {
    const net = open();
    await screen.findByRole("button", { name: "Edit price" });
    fireEvent.click(screen.getByRole("button", { name: "Edit price" }));
    net.on(operations.prices.key, () => ({ status: 200, body: { data: [] } }));
    const dialog = within(await screen.findByRole("dialog"));
    fireEvent.change(dialog.getByLabelText("Amount in minor currency units"), {
      target: { value: "7600" },
    });
    fireEvent.click(dialog.getByRole("button", { name: "Save" }));
    await dialog.findByRole("alert");
    expect(net.count(operations.updatePrice.key)).toBe(0);
    expect(net.count(operations.price.key)).toBe(0);
  });
  it("cannot finish an old edit after the Platform identity changes during preflight", async () => {
    const net = open();
    await screen.findByRole("heading", { name: "Growth خطة" });
    fireEvent.click(screen.getByRole("button", { name: "Edit plan" }));
    let finish: () => void = () => {};
    net.on(
      operations.plan.key,
      () =>
        new Promise((resolve) => {
          finish = () => resolve({ status: 200, body: planDetailBody() });
        }),
    );
    const dialog = within(await screen.findByRole("dialog"));
    fireEvent.change(dialog.getByLabelText("Description"), { target: { value: "Changed" } });
    fireEvent.click(dialog.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(net.count(operations.plan.key)).toBe(2));
    await act(async () => {
      usePlatformSession
        .getState()
        .setSession(platformSessionFixture({ publicId: priceId, permissions: planPermissions }));
      finish();
    });
    await waitFor(() => expect(net.count(operations.update.key)).toBe(0));
    expect(net.count(operations.update.key)).toBe(0);
  });
});
