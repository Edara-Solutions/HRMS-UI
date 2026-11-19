import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { Component, type ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { usePlatformSession } from "@/shared/auth";
import { platformSessionFixture } from "../../../../test/audience-fixtures";
import { problemBody } from "../../../../test/operation-fakes";
import { operationNetwork } from "../../../../test/operation-request-mock";
import {
  accessSessionBody,
  delegatedEmailSettingsBody,
  delegatedEmployeeBody,
  delegatedProfileBody,
  delegatedRoleBody,
  delegatedRolesBody,
  delegatedSendingDomainBody,
  delegatedStepBody,
  delegatedUsersBody,
  everyDelegatedPermission,
  accessSessionIds as ids,
} from "../../../../test/platform-access-session-fixtures";
import { companyBody } from "../../../../test/platform-company-fixtures";
import "../../../../test/router-mock";
import type { WorkspaceArea } from "../model/session";
import { AccessSessionPage } from "./access-session-page";

const base = "/api/v1/platform/access-sessions/{sessionPublicId}";
const key = {
  session: `GET ${base}`,
  close: `POST ${base}/close`,
  users: `GET ${base}/users`,
  user: `GET ${base}/users/{userPublicId}`,
  updateUser: `PATCH ${base}/users/{userPublicId}`,
  roles: `GET ${base}/roles`,
  role: `GET ${base}/roles/{rolePublicId}`,
  profile: `GET ${base}/profile`,
  setup: `GET ${base}/setup`,
  start: `POST ${base}/setup/{stepPublicId}/start`,
  emailSettings: `GET ${base}/email-settings`,
  readiness: `GET ${base}/email-readiness`,
  assignments: `GET ${base}/email-template-assignments`,
  unassign: `DELETE ${base}/email-template-assignments/{emailTypeKey}`,
  domain: `GET ${base}/sending-domain`,
  audit: `GET ${base}/audit-trail`,
} as const;

class Boundary extends Component<{ children: ReactNode }, { error: unknown }> {
  state: { error: unknown } = { error: null };
  static getDerivedStateFromError(error: unknown) {
    return { error };
  }
  render() {
    const { error } = this.state;
    if (error instanceof Error && "status" in error) return <p>boundary {String(error.status)}</p>;
    return error ? <p>boundary</p> : this.props.children;
  }
}

interface OpenOptions {
  permissions?: readonly string[];
  session?: Record<string, unknown>;
  area?: WorkspaceArea;
}

function open({ permissions = everyDelegatedPermission, session, area }: OpenOptions = {}) {
  const net = operationNetwork.install();
  const platform = platformSessionFixture({ permissions: [...permissions] });
  usePlatformSession.getState().setSession(platform);
  net.on("GET /api/v1/platform/me", () => ({ status: 200, body: platform.user }));
  net.on(key.session, () => ({ status: 200, body: accessSessionBody(session) }));
  net.on("GET /api/v1/platform/companies/{publicId}", () => ({
    status: 200,
    body: companyBody(),
  }));
  net.on(key.users, () => ({ status: 200, body: delegatedUsersBody() }));
  net.on(key.user, () => ({ status: 200, body: delegatedEmployeeBody() }));
  net.on(key.roles, () => ({ status: 200, body: delegatedRolesBody() }));
  net.on(key.role, () => ({ status: 200, body: delegatedRoleBody() }));
  net.on(key.profile, () => ({ status: 200, body: delegatedProfileBody() }));
  net.on(key.setup, () => ({
    status: 200,
    body: { templateVersion: 1, steps: [delegatedStepBody()] },
  }));
  net.on(key.emailSettings, () => ({ status: 200, body: delegatedEmailSettingsBody() }));
  net.on(key.readiness, () => ({ status: 200, body: { ready: false, reason: "reason-canary" } }));
  net.on(key.assignments, () => ({
    status: 200,
    body: { items: [{ emailTypeKey: "auth.invite", templateRevisionKey: "invite-v2" }] },
  }));
  net.on(key.domain, () => ({ status: 200, body: delegatedSendingDomainBody() }));
  net.on(key.audit, () => ({ status: 200, body: { items: [], nextCursor: null, hasMore: false } }));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <Boundary>
        <AccessSessionPage sessionPublicId={ids.session} search={{ area }} />
      </Boundary>
    </QueryClientProvider>,
  );
  return { net, client, platform };
}

afterEach(() => {
  cleanup();
  usePlatformSession.getState().clearSession();
});

const delegatedKeys = (net: ReturnType<typeof open>["net"]) =>
  net.calls.filter((call) => call.audience === "delegated");

describe("Access Session workspace", () => {
  it("shows fixed metadata and only the areas each exact grant admits", async () => {
    const { net, client, platform } = open({
      permissions: ["delegation:open", "delegation:roles:read", "companies:read"],
    });
    expect(await screen.findByText("Support session · Acme Company")).toBeInTheDocument();
    expect(screen.getByText("Support request")).toBeInTheDocument();
    expect(screen.getByText("This sign-in")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Roles" })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Employees" })).toBeNull();
    expect(await screen.findByText("HR Manager")).toBeInTheDocument();
    expect(screen.getByText("Roles are read-only in a support session.")).toBeInTheDocument();
    expect(delegatedKeys(net).map((call) => call.key)).toEqual([key.roles]);
    expect(
      client
        .getQueryCache()
        .getAll()
        .filter((query) => query.queryKey[0] === "platform-delegated")
        .every(
          (query) =>
            query.queryKey[1] === platform.user.publicId && query.queryKey[2] === ids.session,
        ),
    ).toBe(true);
    expect(screen.queryByRole("button", { name: /delete|reset|impersonat|switch/i })).toBeNull();
  });

  it("grants nothing on entry alone", async () => {
    const { net } = open({ permissions: ["delegation:open"] });
    expect(
      await screen.findByText(
        "Your current permissions do not include any support area for this session.",
      ),
    ).toBeInTheDocument();
    expect(delegatedKeys(net)).toEqual([]);
    expect(screen.getByRole("button", { name: "Close session" })).toBeInTheDocument();
  });

  it("corrects only the four allowed employee fields and never retries", async () => {
    const { net } = open();
    net.on(key.updateUser, () => ({
      status: 200,
      body: delegatedEmployeeBody({ firstName: "Omar A." }),
    }));
    fireEvent.click(await screen.findByRole("button", { name: "Correct Omar Said" }));
    const dialog = await screen.findByRole("dialog");
    const first = await within(dialog).findByLabelText("First name");
    expect(within(dialog).queryByLabelText(/email|role|status/i)).toBeNull();
    fireEvent.change(first, { target: { value: "Omar A." } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save correction" }));
    expect(await within(dialog).findByText("Change confirmed.")).toBeInTheDocument();
    expect(net.calls.find((call) => call.key === key.updateUser)?.input).toEqual({
      params: { sessionPublicId: ids.session, userPublicId: ids.employee },
      body: { firstName: "Omar A." },
    });
    expect(screen.getByText("Employee details corrected")).toBeInTheDocument();
  });

  it("reports an ambiguous correction without retrying it", async () => {
    const { net } = open();
    net.on(key.updateUser, () => ({ status: 500, body: problemBody(500) }));
    fireEvent.click(await screen.findByRole("button", { name: "Correct Omar Said" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.change(await within(dialog).findByLabelText("Phone"), {
      target: { value: "0100" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save correction" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "The outcome could not be confirmed.",
    );
    expect(net.count(key.updateUser)).toBe(1);
    expect(document.body.textContent).not.toMatch(/canary/);
  });

  it("hides correction without the update grant", async () => {
    open({ permissions: ["delegation:open", "delegation:users:read"] });
    expect(await screen.findByText("Omar Said")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Correct/ })).toBeNull();
  });

  it("closes terminally, clears Company content and keeps minimal metadata", async () => {
    const { net, client } = open();
    net.on(key.close, () => ({
      status: 200,
      body: accessSessionBody({ status: "CLOSED", closedAt: new Date().toISOString() }),
    }));
    expect(await screen.findByText("Omar Said")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close session" }));
    const dialog = await screen.findByRole("dialog");
    expect(net.count(key.close)).toBe(0);
    fireEvent.click(within(dialog).getByRole("button", { name: "Close session" }));
    expect(await screen.findByText("This support session has ended")).toBeInTheDocument();
    expect(screen.queryByText("Omar Said")).toBeNull();
    await waitFor(() => expect(screen.queryByRole("button", { name: "Close session" })).toBeNull());
    expect(screen.getByText("Support request")).toBeInTheDocument();
    expect(net.count(key.close)).toBe(1);
    await waitFor(() =>
      expect(
        client
          .getQueryCache()
          .getAll()
          .some(
            (query) => query.queryKey[0] === "platform-delegated" && query.state.data !== undefined,
          ),
      ).toBe(false),
    );
  });

  it("treats a locally expired session as inactive without delegated requests", async () => {
    const { net } = open({ session: { expiresAt: "2026-01-01T00:00:00.000Z" } });
    expect(await screen.findByText("This support session has ended")).toBeInTheDocument();
    expect(screen.getByText("Expired")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close session" })).toBeInTheDocument();
    expect(delegatedKeys(net)).toEqual([]);
  });

  it("reconciles a delegated refusal against the session and clears content", async () => {
    const { net } = open();
    net.on(key.users, () => ({ status: 403, body: problemBody(403) }));
    net.on(key.session, () => ({
      status: 200,
      body: accessSessionBody({ status: "CLOSED", closedAt: new Date().toISOString() }),
    }));
    expect(await screen.findByText("This support session has ended")).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/canary/);
  });

  it("conceals a foreign or missing session behind the not-found boundary", async () => {
    const { net } = open();
    net.on(key.session, () => ({ status: 404, body: problemBody(404) }));
    cleanup();
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <Boundary>
          <AccessSessionPage sessionPublicId={ids.session} search={{}} />
        </Boundary>
      </QueryClientProvider>,
    );
    expect(await screen.findByText("boundary 404")).toBeInTheDocument();
    expect(delegatedKeys(net)).toEqual([]);
  });

  it("clears content when delegated support permission is lost", async () => {
    const { platform } = open();
    expect(await screen.findByText("Omar Said")).toBeInTheDocument();
    usePlatformSession.getState().setSession({
      ...platform,
      user: { ...platform.user, permissions: ["delegation:users:read"] },
    });
    expect(
      await screen.findByText("Delegated support is no longer available to you"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Omar Said")).toBeNull();
  });

  it("confirms a setup transition before sending it once", async () => {
    const { net } = open({ area: "profile" });
    net.on(key.start, () => ({ status: 200, body: delegatedStepBody("IN_PROGRESS") }));
    fireEvent.click(await screen.findByRole("button", { name: "Start" }));
    expect(net.count(key.start)).toBe(0);
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Start" }));
    await waitFor(() => expect(net.count(key.start)).toBe(1));
    expect(await screen.findByText("Setup step updated")).toBeInTheDocument();
  });

  it("shows email state without raw failure or readiness text", async () => {
    const { net } = open({ area: "email" });
    net.on(key.unassign, () => ({ status: 204 }));
    expect(await screen.findByText("Not ready")).toBeInTheDocument();
    expect(await screen.findByText("A delivery failure was recorded.")).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/canary/);
    fireEvent.click(await screen.findByRole("button", { name: "Remove assignment auth.invite" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Remove" }));
    await waitFor(() => expect(net.count(key.unassign)).toBe(1));
    expect(net.calls.find((call) => call.key === key.unassign)?.input).toEqual({
      params: { sessionPublicId: ids.session, emailTypeKey: "auth.invite" },
    });
  });

  it("marks a missing sending domain as not provisioned", async () => {
    const { net } = open({ area: "email" });
    net.on(key.domain, () => ({ status: 404, body: problemBody(404) }));
    expect(await screen.findAllByText("No sending domain")).not.toHaveLength(0);
  });

  it("keeps an unknown setup status neutral and non-actionable", async () => {
    const { net } = open({ area: "profile" });
    net.on(key.setup, () => ({
      status: 200,
      body: { templateVersion: 1, steps: [delegatedStepBody("ARCHIVED_BY_CANARY")] },
    }));
    expect(await screen.findByText("Unknown status")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Start" })).toBeNull();
    expect(document.body.textContent).not.toMatch(/canary/i);
  });

  it("refuses a malformed delegated response as a contract failure", async () => {
    const { net } = open();
    net.on(key.users, () => ({
      status: 200,
      body: { ...delegatedUsersBody(), internalId: 7 },
    }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.queryByText("Omar Said")).toBeNull();
  });

  it("reads the scoped audit only for this session", async () => {
    const { net } = open({ area: "audit" });
    expect(await screen.findByText("No events recorded.")).toBeInTheDocument();
    expect(net.calls.find((call) => call.key === key.audit)?.input).toEqual({
      params: { sessionPublicId: ids.session },
      query: { limit: 25 },
    });
  });

  it("names the Company from the delegated profile without a registry grant", async () => {
    open({ permissions: ["delegation:open", "delegation:profile:read"] });
    expect(await screen.findByText("Support session · Acme Labs")).toBeInTheDocument();
  });

  it("does not retry an inactive-session refusal before clearing content", async () => {
    const { net } = open();
    net.on(key.users, () => ({ status: 403, body: problemBody(403) }));
    net.on(key.session, () => ({
      status: 200,
      body: accessSessionBody({ status: "EXPIRED" }),
    }));
    expect(await screen.findByText("This support session has ended")).toBeInTheDocument();
    expect(net.count(key.users)).toBe(1);
  });
});
