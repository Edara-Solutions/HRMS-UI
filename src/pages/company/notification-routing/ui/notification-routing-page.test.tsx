import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useCompanySession } from "@/shared/auth";
import { companySessionFixture } from "../../../../test/audience-fixtures";
import { routingBody } from "../../../../test/company-communications-fixtures";
import { accessPolicyBody } from "../../../../test/company-organization-fixtures";
import { catalogueBody, rolesBody } from "../../../../test/company-people-fixtures";
import { operationNetwork } from "../../../../test/operation-request-mock";
import { CompanyNotificationRoutingPage } from "./notification-routing-page";

const router = ["notification-settings", "roles:read", "company-access-policies:read"];
const putKey = "PUT /api/v1/company/notification-settings/{typeKey}";

function renderRouting({ permissions = router, mode = "NORMAL" } = {}) {
  const net = operationNetwork.install();
  net.on("GET /api/v1/company/notification-settings", () => ({ status: 200, body: routingBody() }));
  net.on("GET /api/v1/company/roles", () => ({ status: 200, body: rolesBody() }));
  net.on("GET /api/v1/company/permissions", () => ({ status: 200, body: catalogueBody() }));
  net.on("GET /api/v1/company/access-policy", () => ({
    status: 200,
    body: accessPolicyBody(mode),
  }));
  net.on(putKey, () => ({ status: 204 }));
  useCompanySession.getState().setSession(companySessionFixture({ permissions }));
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <CompanyNotificationRoutingPage />
    </QueryClientProvider>,
  );
  return net;
}

afterEach(() => {
  cleanup();
  useCompanySession.getState().clearSession();
});

async function change(type: string) {
  const button = await screen.findByRole("button", { name: `Change who receives ${type}` });
  await waitFor(() => expect(button).toBeEnabled());
  fireEvent.click(button);
}

async function choose(label: string, option: string) {
  fireEvent.click(screen.getByRole("combobox", { name: label }));
  fireEvent.click(await screen.findByRole("option", { name: option }));
}

describe("Company notification routing", () => {
  it("describes each type's current audience and leaves unknown types neutral and inert", async () => {
    renderRouting();
    expect(await screen.findByText("Subscription updated")).toBeInTheDocument();
    expect(screen.getByText("Everyone with the Manager role")).toBeInTheDocument();
    expect(screen.getByText("Other notification type")).toBeInTheDocument();
    expect(screen.queryByText("company.future-type")).toBeNull();
    expect(screen.queryByRole("button", { name: /Other notification type/ })).toBeNull();
  });

  it("routes a type to a role by name after confirmation", async () => {
    const net = renderRouting();
    await change("Subscription updated");
    await choose("Send to", "Everyone with a role");
    await choose("Role", "Manager");
    fireEvent.click(screen.getByRole("button", { name: "Review change" }));
    fireEvent.click(
      within(await screen.findByRole("dialog")).getByRole("button", { name: "Save routing" }),
    );
    expect(await screen.findByText("Routing for Subscription updated saved.")).toBeInTheDocument();
    expect(net.calls.find((call) => call.key === putKey)?.input).toEqual({
      params: { typeKey: "company.subscription-changed" },
      body: { override: { selectorKind: "role", selectorRef: "Manager" } },
    });
  });

  it("routes by permission action, distinct from role routing", async () => {
    const net = renderRouting();
    await change("Subscription updated");
    await choose("Send to", "Everyone with a permission");
    await choose("Permission", "Edit people");
    fireEvent.click(screen.getByRole("button", { name: "Review change" }));
    fireEvent.click(
      within(await screen.findByRole("dialog")).getByRole("button", { name: "Save routing" }),
    );
    await waitFor(() =>
      expect(net.calls.find((call) => call.key === putKey)?.input).toEqual({
        params: { typeKey: "company.subscription-changed" },
        body: { override: { selectorKind: "permission", selectorRef: "users:update" } },
      }),
    );
  });

  it("warns before sending a type to everyone and returns a type to its default with null", async () => {
    const net = renderRouting();
    await change("New member joined");
    await choose("Send to", "Everyone in the company");
    fireEvent.click(screen.getByRole("button", { name: "Review change" }));
    expect(await screen.findByRole("dialog")).toHaveTextContent(
      "Every active member of the company will receive it.",
    );
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancel" }));
    expect(net.count(putKey)).toBe(0);

    // The editor stays open after a cancelled confirmation, so the reader can adjust the choice.
    await choose("Send to", "Default recipients");
    fireEvent.click(screen.getByRole("button", { name: "Review change" }));
    fireEvent.click(
      within(await screen.findByRole("dialog")).getByRole("button", { name: "Save routing" }),
    );
    await waitFor(() =>
      expect(net.calls.find((call) => call.key === putKey)?.input).toEqual({
        params: { typeKey: "company.user-joined" },
        body: { override: null },
      }),
    );
  });

  it("keeps routing readable but not changeable in a read-only workspace", async () => {
    renderRouting({ mode: "READ_ONLY" });
    const button = await screen.findByRole("button", {
      name: "Change who receives Subscription updated",
    });
    await waitFor(() => expect(button).toBeDisabled());
  });

  it("offers no role or permission selectors without the role catalogue", async () => {
    const net = renderRouting({
      permissions: ["notification-settings", "company-access-policies:read"],
    });
    await change("Subscription updated");
    fireEvent.click(screen.getByRole("combobox", { name: "Send to" }));
    const options = (await screen.findAllByRole("option")).map((option) => option.textContent);
    expect(options).toEqual(["Default recipients", "Everyone in the company"]);
    expect(net.count("GET /api/v1/company/roles")).toBe(0);
  });
});
