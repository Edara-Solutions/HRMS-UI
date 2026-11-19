import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { usePlatformSession } from "@/shared/auth";
import { platformSessionFixture } from "../../../../test/audience-fixtures";
import { problemBody } from "../../../../test/operation-fakes";
import { operationNetwork } from "../../../../test/operation-request-mock";
import {
  platformIds,
  platformRoleBody,
  platformRolesBody,
  rootAuthority,
} from "../../../../test/platform-people-fixtures";
import { navigations } from "../../../../test/router-mock";
import { PlatformRolePage } from "./role-page";
import { PlatformRolesPage } from "./roles-page";

function renderRole({
  role = platformIds.supportRole as string,
  root = true,
  roleNames = undefined as string[] | undefined,
  permissions = ["platform-roles:read", ...rootAuthority] as readonly string[],
  list = false,
} = {}) {
  const net = operationNetwork.install();
  net.on("GET /api/v1/platform/roles", () => ({ status: 200, body: platformRolesBody() }));
  net.on("GET /api/v1/platform/me", () => ({
    status: 200,
    body: platformSessionFixture({ roleNames: ["SUPER_ADMIN"], permissions: [...permissions] })
      .user,
  }));
  navigations.length = 0;
  usePlatformSession.getState().setSession(
    platformSessionFixture({
      roleNames: roleNames ?? (root ? ["SUPER_ADMIN"] : ["Auditor"]),
      permissions: [...permissions],
    }),
  );
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      {list ? <PlatformRolesPage /> : <PlatformRolePage publicId={role} />}
    </QueryClientProvider>,
  );
  return net;
}

afterEach(() => {
  cleanup();
  usePlatformSession.getState().clearSession();
});

describe("Platform roles", () => {
  it("lists roles and hides creation from a non-root reader", async () => {
    renderRole({ list: true, root: false, permissions: ["platform-roles:read"] });
    expect(await screen.findByText("Support")).toBeInTheDocument();
    expect(screen.getByText("Root")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Create role" })).toBeNull();
  });

  it("keeps creation disabled for a reserved-action holder without root standing", async () => {
    renderRole({ list: true, root: false });
    const create = await screen.findByRole("button", { name: "Create role" });
    expect(create).toBeDisabled();
    expect(screen.getByText("Only a current root administrator can do this.")).toBeInTheDocument();
  });

  it("shows a read-only role to a non-root reader", async () => {
    renderRole({ root: false, permissions: ["platform-roles:read"] });
    expect(await screen.findByText("leads:read")).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(screen.queryByRole("button", { name: "Delete role" })).toBeNull();
  });

  it("replaces grants without dropping an action the contract no longer lists", async () => {
    const net = renderRole();
    net.on("PATCH /api/v1/platform/roles/{rolePublicId}", () => ({
      status: 200,
      body: platformRoleBody(platformIds.supportRole, {
        actions: ["leads:read", "retired:action", "plans:read"],
      }),
    }));
    fireEvent.click(await screen.findByRole("checkbox", { name: "Grant plans:read" }));
    expect(screen.getByText("1 to add, 0 to remove")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save actions" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Save actions" }));
    expect(await screen.findByText("Actions saved.")).toBeInTheDocument();
    expect(net.calls.find((call) => call.key.startsWith("PATCH"))?.input).toEqual({
      params: { rolePublicId: platformIds.supportRole },
      body: { actions: ["retired:action", "leads:read", "plans:read"] },
    });
  });

  it("never offers a root-reserved action as a grant", async () => {
    renderRole();
    await screen.findByRole("checkbox", { name: "Grant plans:read" });
    expect(screen.queryByRole("checkbox", { name: "Grant platform-roles:assign" })).toBeNull();
  });

  it("disables grants and deletion of a role the actor holds", async () => {
    renderRole({ roleNames: ["SUPER_ADMIN", "Support"] });
    const grant = await screen.findByRole("checkbox", { name: "Grant plans:read" });
    expect(grant).toBeDisabled();
    expect(screen.getByRole("button", { name: "Delete role" })).toBeDisabled();
    expect(
      screen.getAllByText("You hold this role, so you cannot change its grants or delete it.")
        .length,
    ).toBeGreaterThan(0);
  });

  it("keeps the root role immutable", async () => {
    renderRole({ role: platformIds.rootRole });
    expect(
      await screen.findByText("The root role holds every Platform action and cannot be changed."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Role name")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Delete role" })).toBeDisabled();
  });

  it("reconciles a role still in use instead of retrying deletion", async () => {
    const net = renderRole();
    net.on("DELETE /api/v1/platform/roles/{rolePublicId}", () => ({
      status: 409,
      body: problemBody(409),
    }));
    fireEvent.click(await screen.findByRole("button", { name: "Delete role" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete role" }));
    expect(await screen.findByText(/This change was not applied/)).toBeInTheDocument();
    expect(net.count("DELETE /api/v1/platform/roles/{rolePublicId}")).toBe(1);
    await waitFor(() => expect(net.count("GET /api/v1/platform/roles")).toBe(2));
    expect(navigations).toEqual([]);
  });
});
