import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useCompanySession } from "@/shared/auth";
import { companySessionFixture } from "../../../../test/audience-fixtures";
import { accessPolicyBody } from "../../../../test/company-organization-fixtures";
import {
  assignmentBody,
  lastUsableOwner,
  otherOwner,
  peopleCanaries,
  peopleIds,
  personBody,
  rolesBody,
  sessionsBody,
} from "../../../../test/company-people-fixtures";
import { problemBody } from "../../../../test/operation-fakes";
import { operationNetwork } from "../../../../test/operation-request-mock";
import { navigations } from "../../../../test/router-mock";
import { CompanyPersonPage } from "./person-page";

const administrator = [
  "users:read",
  "users:update",
  "users:delete",
  "users:reset-password",
  "sessions:read",
  "sessions:revoke",
  "roles:read",
  "roles:assign",
  "company-access-policies:read",
];

interface RenderPersonOptions {
  target?: string;
  targetRole?: string | null;
  permissions?: string[];
  actorIsOwner?: boolean;
  mode?: string;
  status?: string;
  person?: Record<string, unknown>;
}

function renderPerson({
  target = peopleIds.colleague,
  targetRole = peopleIds.employeeRole,
  permissions = administrator,
  actorIsOwner = false,
  mode = "NORMAL",
  status = "ACTIVE",
  person,
}: RenderPersonOptions = {}) {
  const net = operationNetwork.install();
  net.on("GET /api/v1/company/users/{publicId}", () => ({
    status: 200,
    body: personBody(target, { status, ...person }),
  }));
  net.on("GET /api/v1/company/users/{publicId}/role", () =>
    targetRole
      ? { status: 200, body: assignmentBody(target, targetRole) }
      : { status: 404, body: problemBody(404) },
  );
  net.on("GET /api/v1/company/users/{publicId}/sessions", () => ({
    status: 200,
    body: sessionsBody(),
  }));
  net.on("GET /api/v1/company/roles", () => ({ status: 200, body: rolesBody() }));
  net.on("GET /api/v1/company/users", () => ({
    status: 200,
    body: {
      items: [],
      meta: { mode: "page", page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
    },
  }));
  net.on("GET /api/v1/company/access-policy", () => ({
    status: 200,
    body: accessPolicyBody(mode),
  }));
  navigations.length = 0;
  useCompanySession
    .getState()
    .setSession(
      companySessionFixture({ publicId: peopleIds.actor, permissions, isOwner: actorIsOwner }),
    );
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <CompanyPersonPage publicId={target} />
    </QueryClientProvider>,
  );
  return net;
}

afterEach(() => {
  cleanup();
  useCompanySession.getState().clearSession();
});

async function confirmIn(name: string, typed?: string) {
  const dialog = await screen.findByRole("dialog");
  if (typed) fireEvent.change(within(dialog).getByRole("textbox"), { target: { value: typed } });
  fireEvent.click(within(dialog).getByRole("button", { name }));
}

describe("Company person detail", () => {
  it("saves only edited allow-listed fields by public ID", async () => {
    const net = renderPerson();
    net.on("PATCH /api/v1/company/users/{publicId}", () => ({
      status: 200,
      body: personBody(peopleIds.colleague, { level: "L3" }),
    }));
    const level = await screen.findByLabelText("Level");
    await waitFor(() => expect(level).toBeEnabled());
    fireEvent.change(level, { target: { value: "L3" } });
    fireEvent.click(screen.getByRole("button", { name: "Save details" }));
    expect(await screen.findByText("Details saved.")).toBeInTheDocument();
    expect(net.calls.find((call) => call.key.startsWith("PATCH"))?.input).toEqual({
      params: { publicId: peopleIds.colleague },
      body: { level: "L3" },
    });
  });

  it("names the target and consequence before reissuing an invitation", async () => {
    const net = renderPerson({ status: "ONBOARDING" });
    net.on("POST /api/v1/company/users/{publicId}/invitation", () => ({ status: 204 }));
    fireEvent.click(await screen.findByRole("button", { name: "Resend invitation" }));
    expect(await screen.findByRole("dialog")).toHaveTextContent(
      "Omar Nabil receives a new invitation email.",
    );
    await confirmIn("Resend invitation");
    expect(await screen.findByText("Invitation sent to Omar Nabil.")).toBeInTheDocument();
    expect(net.calls.find((call) => call.key.endsWith("/invitation"))?.input).toEqual({
      params: { publicId: peopleIds.colleague },
      body: {},
    });
  });

  it("never reissues an invitation to an employee who already activated", async () => {
    renderPerson({ status: "ACTIVE" });
    const resend = await screen.findByRole("button", { name: "Resend invitation" });
    await waitFor(() => expect(resend).toBeDisabled());
    expect(
      screen.getByText("This action is not available in the current state."),
    ).toBeInTheDocument();
  });

  it("projects self-target restrictions onto the actor's own record", async () => {
    renderPerson({ target: peopleIds.actor });
    const reset = await screen.findByRole("button", { name: "Require a new password" });
    await waitFor(() => expect(reset).toBeDisabled());
    expect(screen.getByRole("button", { name: "Delete person" })).toBeDisabled();
    expect(screen.getAllByText("Use your own account pages for this.").length).toBeGreaterThan(0);
  });

  it("protects the last usable Owner from removal using the backend's eligibility", async () => {
    renderPerson({
      target: peopleIds.owner,
      targetRole: peopleIds.ownerRole,
      person: lastUsableOwner,
    });
    expect(await screen.findByText("Owner", { selector: "span" })).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Delete person" })).toBeDisabled(),
    );
    expect(screen.getByRole("button", { name: "Remove role" })).toBeDisabled();
    expect(
      screen.getAllByText(
        "This person is the Company's last usable Owner. Transfer ownership first.",
      ).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText("The company Owner changes only through ownership transfer.").length,
    ).toBeGreaterThan(0);
  });

  it("keeps Owner protection when the role catalogue cannot be read", async () => {
    renderPerson({
      target: peopleIds.owner,
      targetRole: peopleIds.ownerRole,
      person: lastUsableOwner,
      permissions: administrator.filter((permission) => permission !== "roles:read"),
    });
    expect(await screen.findByText("Owner", { selector: "span" })).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Delete person" })).toBeDisabled(),
    );
  });

  it("never infers ownership from the role catalogue", async () => {
    renderPerson({ target: peopleIds.owner, targetRole: peopleIds.ownerRole });
    const remove = await screen.findByRole("button", { name: "Delete person" });
    await waitFor(() => expect(screen.getByRole("button", { name: "Remove role" })).toBeEnabled());
    expect(remove).toBeEnabled();
    expect(screen.queryByText("Owner", { selector: "span" })).toBeNull();
  });

  it("allows removing an Owner who is not the last usable Owner", async () => {
    renderPerson({
      target: peopleIds.owner,
      targetRole: peopleIds.ownerRole,
      status: "SUSPENDED",
      person: otherOwner,
    });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Delete person" })).toBeEnabled(),
    );
    expect(await screen.findByRole("button", { name: "Remove role" })).toBeDisabled();
  });

  it("offers the last usable Owner only working statuses and says why", async () => {
    renderPerson({
      target: peopleIds.owner,
      targetRole: peopleIds.ownerRole,
      person: lastUsableOwner,
    });
    const status = await screen.findByRole("combobox", { name: "Status" });
    await waitFor(() => expect(status).toBeEnabled());
    fireEvent.click(status);
    const options = (await screen.findAllByRole("option")).map((option) => option.textContent);
    expect(options).toEqual(["Active", "Onboarding", "Probation"]);
  });

  it("explains a server refusal to remove an Owner", async () => {
    const net = renderPerson({
      target: peopleIds.owner,
      targetRole: peopleIds.ownerRole,
      person: otherOwner,
    });
    net.on("DELETE /api/v1/company/users/{publicId}", () => ({
      status: 403,
      body: problemBody(403),
    }));
    net.on("GET /api/v1/company/me", () => ({
      status: 200,
      body: companySessionFixture({ publicId: peopleIds.actor, permissions: administrator }).user,
    }));
    const remove = await screen.findByRole("button", { name: "Delete person" });
    await waitFor(() => expect(remove).toBeEnabled());
    fireEvent.click(remove);
    await confirmIn("Delete person", "EMP-0");
    expect(
      await screen.findByText(
        "This change would leave the Company without a usable Owner. Transfer ownership first.",
      ),
    ).toBeInTheDocument();
    expect(navigations).toEqual([]);
  });

  it("explains a server refusal to set an Owner's status that cannot sign in", async () => {
    const net = renderPerson({
      target: peopleIds.owner,
      targetRole: peopleIds.ownerRole,
      person: otherOwner,
    });
    net.on("PATCH /api/v1/company/users/{publicId}", () => ({
      status: 403,
      body: problemBody(403),
    }));
    net.on("GET /api/v1/company/me", () => ({
      status: 200,
      body: companySessionFixture({ publicId: peopleIds.actor, permissions: administrator }).user,
    }));
    const status = await screen.findByRole("combobox", { name: "Status" });
    await waitFor(() => expect(status).toBeEnabled());
    fireEvent.click(status);
    fireEvent.click(await screen.findByRole("option", { name: "Suspended" }));
    fireEvent.click(screen.getByRole("button", { name: "Save details" }));
    expect(
      await screen.findByText(
        "This change would leave the Company without a usable Owner. Transfer ownership first.",
      ),
    ).toBeInTheDocument();
  });

  it("keeps the generic refusal for an Owner edit that cannot affect continuity", async () => {
    const net = renderPerson({
      target: peopleIds.owner,
      targetRole: peopleIds.ownerRole,
      person: otherOwner,
    });
    net.on("PATCH /api/v1/company/users/{publicId}", () => ({
      status: 403,
      body: problemBody(403),
    }));
    net.on("GET /api/v1/company/me", () => ({
      status: 200,
      body: companySessionFixture({ publicId: peopleIds.actor, permissions: administrator }).user,
    }));
    const firstName = await screen.findByLabelText("First name");
    await waitFor(() => expect(firstName).toBeEnabled());
    fireEvent.change(firstName, { target: { value: "Layla" } });
    fireEvent.click(screen.getByRole("button", { name: "Save details" }));
    expect(
      await screen.findByText(
        "You can no longer make this change. Your access and this record were refreshed.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(
        "This change would leave the Company without a usable Owner. Transfer ownership first.",
      ),
    ).toBeNull();
  });

  it("never offers the Owner role for assignment", async () => {
    renderPerson();
    fireEvent.click(await screen.findByRole("combobox", { name: "Change role" }));
    const options = (await screen.findAllByRole("option")).map((option) => option.textContent);
    expect(options).toEqual(["Manager"]);
  });

  it("requires the actor to be the Owner and the typed code to transfer ownership", async () => {
    const net = renderPerson({
      actorIsOwner: true,
    });
    net.on("POST /api/v1/company/roles/transfer-ownership", () => ({ status: 204 }));
    net.on("GET /api/v1/company/me", () => ({
      status: 200,
      body: companySessionFixture({ publicId: peopleIds.actor, permissions: administrator }).user,
    }));
    const transfer = await screen.findByRole("button", { name: "Transfer ownership" });
    await waitFor(() => expect(transfer).toBeEnabled());
    fireEvent.click(transfer);
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("button", { name: "Transfer ownership" })).toBeDisabled();
    await confirmIn("Transfer ownership", "EMP-7");
    expect(await screen.findByText("Omar Nabil is now the Owner.")).toBeInTheDocument();
    expect(net.calls.find((call) => call.key.endsWith("transfer-ownership"))?.input).toEqual({
      body: { toUserPublicId: peopleIds.colleague },
    });
    await waitFor(() => expect(net.count("GET /api/v1/company/me")).toBe(1));
  });

  it("keeps transfer disabled for a non-Owner actor", async () => {
    renderPerson();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Transfer ownership" })).toBeDisabled(),
    );
    expect(screen.getByText("Only the current Owner can transfer ownership.")).toBeInTheDocument();
  });

  it("reconciles a stale role change and never retries it", async () => {
    const net = renderPerson();
    net.on("POST /api/v1/company/users/{publicId}/role", () => ({
      status: 409,
      body: problemBody(409),
    }));
    fireEvent.click(await screen.findByRole("combobox", { name: "Change role" }));
    fireEvent.click(await screen.findByRole("option", { name: "Manager" }));
    fireEvent.click(screen.getByRole("button", { name: "Assign role" }));
    expect(await screen.findByRole("dialog")).toHaveTextContent(
      "Omar Nabil will lose the permissions of Employee and get those of Manager.",
    );
    await confirmIn("Assign role");
    expect(
      await screen.findByText(
        "This record changed since you opened it. It has been refreshed; review it before trying again.",
      ),
    ).toBeInTheDocument();
    expect(net.count("POST /api/v1/company/users/{publicId}/role")).toBe(1);
    await waitFor(() => expect(net.count("GET /api/v1/company/users/{publicId}/role")).toBe(2));
  });

  it("deletes only after the typed employee code and returns to the roster", async () => {
    const net = renderPerson();
    net.on("DELETE /api/v1/company/users/{publicId}", () => ({ status: 204 }));
    fireEvent.click(await screen.findByRole("button", { name: "Delete person" }));
    await confirmIn("Delete person", "EMP-7");
    await waitFor(() => expect(navigations).toEqual([{ to: "/company/people" }]));
    expect(net.count("DELETE /api/v1/company/users/{publicId}")).toBe(1);
  });

  it("revokes one named session and keeps network identifiers out of the page", async () => {
    const net = renderPerson();
    net.on("DELETE /api/v1/company/users/{publicId}/sessions/{sessionPublicId}", () => ({
      status: 204,
    }));
    fireEvent.click(await screen.findByRole("button", { name: "Sign out Work laptop" }));
    await confirmIn("Sign out");
    expect(await screen.findByText("Work laptop was signed out.")).toBeInTheDocument();
    expect(net.calls.find((call) => call.key.includes("/sessions/"))?.input).toEqual({
      params: { publicId: peopleIds.colleague, sessionPublicId: peopleIds.session },
    });
    for (const canary of peopleCanaries) expect(document.body.textContent).not.toContain(canary);
  });

  it.each([
    "READ_ONLY",
    "FROZEN",
    "MAINTENANCE",
  ])("disables every command in %s mode", async (mode) => {
    renderPerson({ mode });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Resend invitation" })).toBeDisabled(),
    );
    expect(screen.getByLabelText("First name")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Delete person" })).toBeDisabled();
  });

  it("treats a missing role assignment as no role, not a concealed person", async () => {
    renderPerson({ targetRole: null });
    expect(await screen.findByText("No role is assigned.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove role" })).toBeNull();
  });
});
