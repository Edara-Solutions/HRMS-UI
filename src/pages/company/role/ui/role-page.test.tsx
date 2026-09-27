import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useCompanySession } from "@/shared/auth";
import { companySessionFixture } from "../../../../test/audience-fixtures";
import { accessPolicyBody } from "../../../../test/company-organization-fixtures";
import { catalogueBody, peopleIds, roleDetailBody } from "../../../../test/company-people-fixtures";
import { problemBody } from "../../../../test/operation-fakes";
import { operationNetwork } from "../../../../test/operation-request-mock";
import { navigations } from "../../../../test/router-mock";
import { CompanyRolePage } from "./role-page";

const roleEditor = ["roles:read", "roles:update", "roles:delete", "company-access-policies:read"];

function renderRole({
  role = peopleIds.managerRole as string,
  granted = [peopleIds.permissionRead, peopleIds.retiredPermission] as string[],
  permissions = roleEditor,
  mode = "NORMAL",
} = {}) {
  const net = operationNetwork.install();
  net.on("GET /api/v1/company/roles/{publicId}", () => ({
    status: 200,
    body: roleDetailBody(role, granted),
  }));
  net.on("GET /api/v1/company/permissions", () => ({ status: 200, body: catalogueBody() }));
  net.on("GET /api/v1/company/access-policy", () => ({
    status: 200,
    body: accessPolicyBody(mode),
  }));
  navigations.length = 0;
  useCompanySession
    .getState()
    .setSession(companySessionFixture({ publicId: peopleIds.actor, permissions }));
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <CompanyRolePage publicId={role} />
    </QueryClientProvider>,
  );
  return net;
}

afterEach(() => {
  cleanup();
  useCompanySession.getState().clearSession();
});

describe("Company role detail", () => {
  it("replaces permissions from the catalogue only, after an authority-change confirmation", async () => {
    const net = renderRole();
    net.on("PUT /api/v1/company/roles/{publicId}/permissions", () => ({
      status: 200,
      body: roleDetailBody(peopleIds.managerRole, [
        peopleIds.permissionRead,
        peopleIds.permissionWrite,
      ]),
    }));
    const write = await screen.findByRole("checkbox", { name: /Edit people/ });
    await waitFor(() => expect(write).toBeEnabled());
    fireEvent.click(write);
    expect(screen.getByText("1 to add, 1 to remove")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save permissions" }));
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("Everyone with Manager gains 1 and loses 1 permissions");
    fireEvent.click(within(dialog).getByRole("button", { name: "Save permissions" }));
    expect(await screen.findByText("Permissions saved.")).toBeInTheDocument();
    expect(net.calls.find((call) => call.key.startsWith("PUT"))?.input).toEqual({
      params: { publicId: peopleIds.managerRole },
      body: { permissionIds: [peopleIds.permissionRead, peopleIds.permissionWrite] },
    });
  });

  it("shows unconditional Owner access instead of an editable catalogue", async () => {
    const net = renderRole({ role: peopleIds.ownerRole, granted: [] });
    expect(
      await screen.findByText(
        "The Owner role has unconditional access. Its permissions cannot be edited.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(net.count("GET /api/v1/company/permissions")).toBe(0);
    await waitFor(() => expect(screen.getByRole("button", { name: "Delete role" })).toBeDisabled());
  });

  it("keeps system role names immutable", async () => {
    renderRole({ role: peopleIds.employeeRole });
    const name = await screen.findByLabelText("Role name");
    await waitFor(() => expect(name).toBeDisabled());
    expect(screen.getAllByText("System roles cannot be changed this way.").length).toBeGreaterThan(
      0,
    );
  });

  it("restores confirmed grants after a stale permission replacement", async () => {
    const net = renderRole();
    net.on("PUT /api/v1/company/roles/{publicId}/permissions", () => ({
      status: 409,
      body: problemBody(409),
    }));
    const write = await screen.findByRole("checkbox", { name: /Edit people/ });
    await waitFor(() => expect(write).toBeEnabled());
    fireEvent.click(write);
    fireEvent.click(screen.getByRole("button", { name: "Save permissions" }));
    fireEvent.click(
      within(await screen.findByRole("dialog")).getByRole("button", { name: "Save permissions" }),
    );
    expect(
      await screen.findByText(
        "This record changed since you opened it. It has been refreshed; review it before trying again.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /Edit people/ })).not.toBeChecked();
    expect(net.count("PUT /api/v1/company/roles/{publicId}/permissions")).toBe(1);
  });

  it("deletes a custom role after confirmation and returns to the catalogue", async () => {
    const net = renderRole();
    net.on("DELETE /api/v1/company/roles/{publicId}", () => ({ status: 204 }));
    const remove = await screen.findByRole("button", { name: "Delete role" });
    await waitFor(() => expect(remove).toBeEnabled());
    fireEvent.click(remove);
    fireEvent.click(
      within(await screen.findByRole("dialog")).getByRole("button", { name: "Delete role" }),
    );
    await waitFor(() => expect(navigations).toEqual([{ to: "/company/roles" }]));
    expect(net.count("DELETE /api/v1/company/roles/{publicId}")).toBe(1);
  });

  it("lists granted permissions read-only without the update permission", async () => {
    const net = renderRole({ permissions: ["roles:read"] });
    expect(await screen.findByText("users:read")).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(screen.queryByRole("button", { name: "Delete role" })).toBeNull();
    expect(net.count("GET /api/v1/company/permissions")).toBe(0);
  });
});
