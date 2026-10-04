import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { usePlatformSession } from "@/shared/auth";
import { platformSessionFixture } from "../../../../test/audience-fixtures";
import { problemBody } from "../../../../test/operation-fakes";
import { operationNetwork } from "../../../../test/operation-request-mock";
import { companyCursorBody, companyPermissions } from "../../../../test/platform-company-fixtures";
import "../../../../test/router-mock";
import { PlatformSubscriptionsPage } from "./platform-subscriptions-page";

const key = "POST /api/v1/platform/company-subscriptions/expire-trials";
function open(permissions = companyPermissions) {
  const net = operationNetwork.install();
  const session = platformSessionFixture({ permissions });
  usePlatformSession.getState().setSession(session);
  net.on("GET /api/v1/platform/me", () => ({ status: 200, body: session.user }));
  net.on("GET /api/v1/platform/companies/cursor", () => ({
    status: 200,
    body: companyCursorBody(),
  }));
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <PlatformSubscriptionsPage />
    </QueryClientProvider>,
  );
  return net;
}
async function run() {
  fireEvent.click(await screen.findByRole("button", { name: "Run due-trial expiry" }));
  const dialog = await screen.findByRole("dialog");
  expect(within(dialog).getByRole("button", { name: "Run due-trial expiry" })).toBeDisabled();
  fireEvent.change(within(dialog).getByRole("textbox"), { target: { value: "EXPIRE" } });
  fireEvent.click(within(dialog).getByRole("button", { name: "Run due-trial expiry" }));
}
afterEach(() => {
  cleanup();
  usePlatformSession.getState().clearSession();
});
describe("Global Platform trial expiry", () => {
  it("keeps the historical sample overview separate from live Company subscription actions", async () => {
    const net = open(["companies:read"]);
    const liveLinks = await screen.findAllByRole("link", { name: "View subscription" });
    const demo = screen.getByRole("region", { name: "Sample subscription overview" });

    expect(demo).toHaveTextContent("Illustrative data");
    expect(within(demo).getAllByText("Nexus Technologies").length).toBeGreaterThan(0);
    expect(liveLinks).toHaveLength(2);
    for (const link of liveLinks)
      expect(link).toHaveAttribute(
        "href",
        "/platform/companies/33333333-3333-4333-8333-333333333333",
      );

    fireEvent.click(within(demo).getByRole("button", { name: "Trial" }));
    expect(within(demo).queryByText("Nexus Technologies")).toBeNull();
    expect(within(demo).getAllByText("CloudNine Solutions").length).toBeGreaterThan(0);
    expect(net.count("GET /api/v1/platform/companies/cursor")).toBe(1);
  });
  it("requires a global confirmation and shows only the authoritative count", async () => {
    const net = open();
    net.on(key, () => ({ status: 200, body: { expiredCount: 7 } }));
    await screen.findAllByRole("link", { name: "Acme Company" });
    expect(net.count(key)).toBe(0);
    await run();
    expect(await screen.findByText("7 trials expired.")).toBeInTheDocument();
    expect(net.calls.find((call) => call.key === key)).toMatchObject({
      audience: "platform",
      input: {},
    });
    expect(net.count(key)).toBe(1);
  });
  it.each([
    400, 403, 409, 429, 500,
  ])("treats %i as indeterminate, refreshes and never retries", async (status) => {
    const net = open();
    net.on(key, () => ({ status, body: problemBody(status) }));
    await run();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Some trials may already have expired",
    );
    await waitFor(() =>
      expect(net.count("GET /api/v1/platform/companies/cursor")).toBeGreaterThan(1),
    );
    expect(net.count(key)).toBe(1);
    expect(screen.queryByText("0 trials expired.")).toBeNull();
    expect(screen.queryByText(/canary/)).toBeNull();
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.getByRole("button", { name: "Run due-trial expiry" })).toBeDisabled();
  });
  it("handles malformed success and offline outcomes without inventing a count", async () => {
    const net = open();
    net.on(key, () => ({ status: 200, body: { unknown: 0 } }));
    await run();
    expect(await screen.findByRole("alert")).toHaveTextContent("indeterminate");
    expect(net.count(key)).toBe(1);
  });
  it("keeps expiry hidden from registry-only operators", async () => {
    open(["companies:read"]);
    await screen.findAllByRole("link", { name: "Acme Company" });
    expect(screen.queryByRole("button", { name: "Run due-trial expiry" })).toBeNull();
  });
  it("does not retry a failed offline run", async () => {
    const net = open();
    net.on(key, () => {
      throw new TypeError("offline-canary");
    });
    await run();
    expect(await screen.findByRole("alert")).toHaveTextContent("indeterminate");
    expect(net.count(key)).toBe(1);
    expect(screen.queryByText(/offline-canary/)).toBeNull();
  });
});
