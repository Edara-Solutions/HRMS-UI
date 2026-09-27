import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { usePlatformSession } from "@/shared/auth";
import { platformSessionFixture } from "../../../../test/audience-fixtures";
import { type OperationReply, problemBody } from "../../../../test/operation-fakes";
import { operationNetwork } from "../../../../test/operation-request-mock";
import {
  platformAdministrator,
  platformAssignmentsBody,
  platformCanaries,
  platformIds,
  platformPersonBody,
  platformRolesBody,
  platformSessionsBody,
  rootAuthority,
} from "../../../../test/platform-people-fixtures";
import { navigations } from "../../../../test/router-mock";
import { PlatformPersonPage } from "./person-page";

const rootPermissions = [...platformAdministrator, ...rootAuthority];

function actorUser(root: boolean, permissions: readonly string[]) {
  return platformSessionFixture({
    publicId: platformIds.actor,
    roleNames: root ? ["SUPER_ADMIN"] : ["Support"],
    permissions: [...permissions],
  }).user;
}

interface Held {
  publicId: string;
  rolePublicId: string;
}

interface RenderOptions {
  target?: string;
  status?: string;
  held?: Held[];
  root?: boolean;
  permissions?: readonly string[];
  person?: Record<string, unknown>;
  personReply?: () => Promise<OperationReply>;
}

const colleagueHeld: Held[] = [
  { publicId: platformIds.colleagueAssignment, rolePublicId: platformIds.supportRole },
];

function renderPerson({
  target = platformIds.colleague,
  status,
  held = colleagueHeld,
  root = false,
  permissions = platformAdministrator,
  person,
  personReply,
}: RenderOptions = {}) {
  const net = operationNetwork.install();
  net.on(
    "GET /api/v1/platform/users/{publicId}",
    personReply ??
      (() => ({
        status: 200,
        body: person ?? platformPersonBody(target, status ? { status } : {}),
      })),
  );
  net.on("GET /api/v1/platform/role-assignments", () => ({
    status: 200,
    body: platformAssignmentsBody(target, held),
  }));
  net.on("GET /api/v1/platform/roles", () => ({ status: 200, body: platformRolesBody() }));
  net.on("GET /api/v1/platform/users/{publicId}/sessions", () => ({
    status: 200,
    body: platformSessionsBody(),
  }));
  net.on("GET /api/v1/platform/users", () => ({
    status: 200,
    body: {
      items: [],
      meta: { mode: "page", page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
    },
  }));
  net.on("GET /api/v1/platform/me", () => ({ status: 200, body: actorUser(root, permissions) }));
  navigations.length = 0;
  usePlatformSession.getState().setSession({
    ...platformSessionFixture(),
    user: actorUser(root, permissions),
  });
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <PlatformPersonPage publicId={target} />
    </QueryClientProvider>,
  );
  return net;
}

afterEach(() => {
  cleanup();
  usePlatformSession.getState().clearSession();
});

/** Roster commands stay disabled until the target's root standing is verified. */
async function enabledButton(name: string) {
  const button = await screen.findByRole("button", { name });
  await waitFor(() => expect(button).toBeEnabled());
  return button;
}

async function confirmIn(name: string, typed?: string) {
  const dialog = await screen.findByRole("dialog");
  if (typed) fireEvent.change(within(dialog).getByRole("textbox"), { target: { value: typed } });
  fireEvent.click(within(dialog).getByRole("button", { name }));
}

describe("Platform person detail", () => {
  it("saves only edited safe profile fields by public ID", async () => {
    const net = renderPerson();
    net.on("PATCH /api/v1/platform/users/{publicId}", () => ({
      status: 200,
      body: platformPersonBody(platformIds.colleague, { jobTitle: "Lead" }),
    }));
    const jobTitle = await screen.findByLabelText("Job title");
    fireEvent.change(jobTitle, { target: { value: "Lead" } });
    fireEvent.click(screen.getByRole("button", { name: "Save profile" }));
    expect(await screen.findByText("Profile saved.")).toBeInTheDocument();
    expect(net.calls.find((call) => call.key.startsWith("PATCH"))?.input).toEqual({
      params: { publicId: platformIds.colleague },
      body: { jobTitle: "Lead" },
    });
    expect(screen.queryByLabelText("Email")).toBeNull();
  });

  it("keeps role inspection read-only without current root standing", async () => {
    renderPerson({ permissions: [...platformAdministrator, "platform-roles:assign"] });
    expect(await screen.findByText("Support")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove Support" })).toBeDisabled();
    expect(screen.getByRole("combobox", { name: "Assign a role" })).toBeDisabled();
    expect(
      screen.getAllByText("Only a current root administrator can do this.").length,
    ).toBeGreaterThan(0);
  });

  it("hides role mutation when the reserved permission is absent, even for SUPER_ADMIN", async () => {
    renderPerson({ root: true });
    expect(await screen.findByText("Support")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove Support" })).toBeNull();
    expect(screen.queryByRole("combobox", { name: "Assign a role" })).toBeNull();
  });

  it("lets a root holder assign a role that never expires for the root role", async () => {
    const net = renderPerson({ root: true, permissions: rootPermissions });
    net.on("POST /api/v1/platform/role-assignments", () => ({
      status: 201,
      body: {
        publicId: platformIds.rootAssignment,
        platformUserPublicId: platformIds.colleague,
        rolePublicId: platformIds.rootRole,
        expiresAt: null,
      },
    }));
    const select = await screen.findByRole("combobox", { name: "Assign a role" });
    await waitFor(() => expect(select).toBeEnabled());
    fireEvent.click(select);
    const options = (await screen.findAllByRole("option")).map((option) => option.textContent);
    expect(options).toEqual(["SUPER_ADMIN", "Auditor"]);
    fireEvent.click(screen.getByRole("option", { name: "SUPER_ADMIN" }));
    expect(screen.getByLabelText("Expires (optional)")).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Assign role" }));
    expect(await screen.findByRole("dialog")).toHaveTextContent("becomes a root administrator");
    await confirmIn("Assign role");
    expect(await screen.findByText("Omar Nabil now holds SUPER_ADMIN.")).toBeInTheDocument();
    expect(
      net.calls.find((call) => call.key.startsWith("POST /api/v1/platform/role"))?.input,
    ).toEqual({
      body: {
        platformUserPublicId: platformIds.colleague,
        rolePublicId: platformIds.rootRole,
        expiresAt: null,
      },
    });
  });

  it("refuses a past expiry before any request", async () => {
    const net = renderPerson({ root: true, permissions: rootPermissions });
    const select = await screen.findByRole("combobox", { name: "Assign a role" });
    await waitFor(() => expect(select).toBeEnabled());
    fireEvent.click(select);
    fireEvent.click(await screen.findByRole("option", { name: "Auditor" }));
    fireEvent.change(screen.getByLabelText("Expires (optional)"), {
      target: { value: "2000-01-01T10:00" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Assign role" }));
    expect(await screen.findByText("Choose a time in the future.")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(net.count("POST /api/v1/platform/role-assignments")).toBe(0);
  });

  it("projects self-target restrictions onto the actor's own record", async () => {
    renderPerson({ target: platformIds.actor, root: true, permissions: rootPermissions });
    const suspend = await screen.findByRole("button", { name: "Suspend" });
    await waitFor(() => expect(suspend).toBeDisabled());
    expect(screen.getByRole("button", { name: "Remove from Platform" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Require a new password" })).toBeDisabled();
    await waitFor(() =>
      expect(screen.getByRole("combobox", { name: "Assign a role" })).toBeDisabled(),
    );
    expect(screen.getAllByText("Use your own account pages for this.").length).toBeGreaterThan(0);
  });

  it("protects a root target from a non-root actor but not from a root actor", async () => {
    const held = [{ publicId: platformIds.rootAssignment, rolePublicId: platformIds.rootRole }];
    renderPerson({ target: platformIds.root, held });
    expect(await screen.findByText("Root", { selector: "span" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "Suspend" })).toBeDisabled());
    expect(screen.getByRole("button", { name: "Sign out Ops laptop" })).toBeDisabled();
    expect(
      screen.getAllByText("Only a root administrator can change a root administrator.").length,
    ).toBeGreaterThan(0);
    cleanup();
    renderPerson({ target: platformIds.root, held, root: true, permissions: rootPermissions });
    const suspend = await screen.findByRole("button", { name: "Suspend" });
    await waitFor(() => expect(suspend).toBeEnabled());
  });

  it("reconciles a final-root refusal without retrying and re-reads authority", async () => {
    const held = [{ publicId: platformIds.rootAssignment, rolePublicId: platformIds.rootRole }];
    const net = renderPerson({
      target: platformIds.root,
      held,
      root: true,
      permissions: rootPermissions,
    });
    net.on("DELETE /api/v1/platform/role-assignments/{assignmentPublicId}", () => ({
      status: 409,
      body: problemBody(409),
    }));
    const remove = await screen.findByRole("button", { name: "Remove SUPER_ADMIN" });
    await waitFor(() => expect(remove).toBeEnabled());
    fireEvent.click(remove);
    await confirmIn("Remove role");
    expect(
      await screen.findByText(
        "This change was not applied because the record or the Platform roster changed. Both were refreshed; review them before trying again.",
      ),
    ).toBeInTheDocument();
    expect(net.count("DELETE /api/v1/platform/role-assignments/{assignmentPublicId}")).toBe(1);
    await waitFor(() => expect(net.count("GET /api/v1/platform/me")).toBe(1));
    await waitFor(() => expect(net.count("GET /api/v1/platform/role-assignments")).toBe(2));
    for (const canary of platformCanaries) expect(document.body.textContent).not.toContain(canary);
  });

  it("recomputes controls when a concurrent removal takes the actor's root standing", async () => {
    const net = renderPerson({ root: true, permissions: rootPermissions });
    net.on("DELETE /api/v1/platform/role-assignments/{assignmentPublicId}", () => ({
      status: 403,
      body: problemBody(403),
    }));
    net.on("GET /api/v1/platform/me", () => ({
      status: 200,
      body: actorUser(false, [...platformAdministrator, "platform-roles:assign"]),
    }));
    const remove = await screen.findByRole("button", { name: "Remove Support" });
    await waitFor(() => expect(remove).toBeEnabled());
    fireEvent.click(remove);
    await confirmIn("Remove role");
    expect(
      await screen.findByText(
        "You can no longer make this change. Your access and this record were refreshed.",
      ),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Remove Support" })).toBeDisabled(),
    );
    expect(net.count("DELETE /api/v1/platform/role-assignments/{assignmentPublicId}")).toBe(1);
  });

  it("hides every control after permission loss is re-read", async () => {
    const net = renderPerson();
    net.on("POST /api/v1/platform/users/{publicId}/suspend", () => ({
      status: 403,
      body: problemBody(403),
    }));
    net.on("GET /api/v1/platform/me", () => ({
      status: 200,
      body: actorUser(false, ["platform-users:read"]),
    }));
    fireEvent.click(await enabledButton("Suspend"));
    await confirmIn("Suspend");
    await waitFor(() => expect(screen.queryByRole("button", { name: "Suspend" })).toBeNull());
    expect(screen.queryByRole("button", { name: "Save profile" })).toBeNull();
  });

  it("treats a stale assignment as a conflict to reconcile", async () => {
    const net = renderPerson({ root: true, permissions: rootPermissions });
    net.on("DELETE /api/v1/platform/role-assignments/{assignmentPublicId}", () => ({
      status: 404,
      body: problemBody(404),
    }));
    const remove = await screen.findByRole("button", { name: "Remove Support" });
    await waitFor(() => expect(remove).toBeEnabled());
    fireEvent.click(remove);
    await confirmIn("Remove role");
    expect(await screen.findByText(/This change was not applied/)).toBeInTheDocument();
    expect(
      net.calls.find((call) => call.key.startsWith("DELETE /api/v1/platform/role"))?.input,
    ).toEqual({ params: { assignmentPublicId: platformIds.colleagueAssignment } });
  });

  it("keeps lifecycle commands distinct and state-bound", async () => {
    renderPerson({ target: platformIds.pending, status: "PENDING" });
    await enabledButton("Resend invitation");
    expect(screen.getByRole("button", { name: "Require a new password" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Suspend" })).toBeDisabled();
    cleanup();
    renderPerson({ status: "SUSPENDED" });
    await enabledButton("Unsuspend");
    expect(screen.queryByRole("button", { name: "Suspend" })).toBeNull();
    expect(screen.getByRole("button", { name: "Resend invitation" })).toBeDisabled();
  });

  it("names the target and consequence before forcing recovery", async () => {
    const net = renderPerson();
    net.on("POST /api/v1/platform/users/{publicId}/password-reset", () => ({ status: 204 }));
    fireEvent.click(await enabledButton("Require a new password"));
    expect(await screen.findByRole("dialog")).toHaveTextContent(
      "Omar Nabil is signed out everywhere",
    );
    await confirmIn("Require a new password");
    expect(await screen.findByText("Omar Nabil must now set a new password.")).toBeInTheDocument();
    expect(net.calls.find((call) => call.key.endsWith("/password-reset"))?.input).toEqual({
      params: { publicId: platformIds.colleague },
      body: {},
    });
  });

  it("removes only after the typed email and returns to the roster", async () => {
    const net = renderPerson();
    net.on("DELETE /api/v1/platform/users/{publicId}", () => ({ status: 204 }));
    fireEvent.click(await enabledButton("Remove from Platform"));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("button", { name: "Remove from Platform" })).toBeDisabled();
    await confirmIn("Remove from Platform", "omar@edara.test");
    await waitFor(() => expect(navigations).toEqual([{ to: "/platform/people" }]));
    expect(net.count("DELETE /api/v1/platform/users/{publicId}")).toBe(1);
  });

  it("revokes one named session and keeps network identifiers out of the page", async () => {
    const net = renderPerson();
    net.on("DELETE /api/v1/platform/users/{publicId}/sessions/{sessionPublicId}", () => ({
      status: 204,
    }));
    fireEvent.click(await screen.findByRole("button", { name: "Sign out Ops laptop" }));
    await confirmIn("Sign out");
    expect(await screen.findByText("Ops laptop was signed out.")).toBeInTheDocument();
    expect(net.calls.find((call) => call.key.includes("/sessions/"))?.input).toEqual({
      params: { publicId: platformIds.colleague, sessionPublicId: platformIds.session },
    });
    for (const canary of platformCanaries) expect(document.body.textContent).not.toContain(canary);
  });

  it("reports an offline command as unconfirmed and never retries it", async () => {
    const net = renderPerson();
    net.on("DELETE /api/v1/platform/users/{publicId}/sessions", () => {
      throw new TypeError("Failed to fetch");
    });
    fireEvent.click(await screen.findByRole("button", { name: "Sign out everywhere" }));
    await confirmIn("Sign out everywhere");
    expect(await screen.findByText(/We could not confirm the change/)).toBeInTheDocument();
    expect(net.count("DELETE /api/v1/platform/users/{publicId}/sessions")).toBe(1);
  });

  it("shows the contract-unavailable state for a malformed person", async () => {
    renderPerson({ person: { publicId: "not-a-person" } });
    expect(
      await screen.findByText(
        "This information is temporarily unavailable. Actions that depend on it are paused.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Suspend" })).toBeNull();
  });

  it("fails closed on roster commands while a non-root actor cannot verify root standing", async () => {
    renderPerson({ permissions: platformAdministrator.filter((p) => p !== "platform-roles:read") });
    const suspend = await screen.findByRole("button", { name: "Suspend" });
    expect(suspend).toBeDisabled();
    expect(screen.queryByText("Roles")).toBeNull();
    expect(
      screen.getAllByText(
        "This action is unavailable until this person's protection can be confirmed.",
      ).length,
    ).toBeGreaterThan(0);
  });

  it("treats an undeclared 429 as an unverifiable response and never retries it", async () => {
    const net = renderPerson();
    net.on("POST /api/v1/platform/users/{publicId}/suspend", () => ({
      status: 429,
      body: problemBody(429),
    }));
    const suspend = await screen.findByRole("button", { name: "Suspend" });
    await waitFor(() => expect(suspend).toBeEnabled());
    fireEvent.click(suspend);
    await confirmIn("Suspend");
    expect(await screen.findByText(/could not be verified/)).toBeInTheDocument();
    expect(net.count("POST /api/v1/platform/users/{publicId}/suspend")).toBe(1);
  });

  it("never renders a response that settles after the identity was replaced", async () => {
    let release: (() => void) | undefined;
    const net = renderPerson({
      personReply: async () => {
        await new Promise<void>((resolve) => {
          release = resolve;
        });
        return { status: 200, body: platformPersonBody(platformIds.colleague) };
      },
    });
    await waitFor(() => expect(release).toBeDefined());
    usePlatformSession.getState().setSession(
      platformSessionFixture({
        publicId: platformIds.root,
        roleNames: ["Support"],
        permissions: [...platformAdministrator],
      }),
    );
    release?.();
    await waitFor(() => expect(net.count("GET /api/v1/platform/users/{publicId}")).toBe(1));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.queryByRole("heading", { level: 1, name: "Omar Nabil" })).toBeNull();
  });
});
