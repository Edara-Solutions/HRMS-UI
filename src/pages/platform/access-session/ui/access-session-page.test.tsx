import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { Component, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useCompanySession, usePlatformSession } from "@/shared/auth";
import { companySessionFixture, platformSessionFixture } from "../../../../test/audience-fixtures";
import { problemBody } from "../../../../test/operation-fakes";
import { operationNetwork } from "../../../../test/operation-request-mock";
import {
  accessSessionBody,
  everyDelegatedPermission,
  accessSessionIds as ids,
} from "../../../../test/platform-access-session-fixtures";
import "../../../../test/router-mock";
import type { WorkspaceArea } from "../model/session";
import { AccessSessionPage } from "./access-session-page";

const base = "/api/v1/platform/access-sessions/{sessionPublicId}";
const key = {
  session: `GET ${base}`,
  close: `POST ${base}/close`,
  enter: `POST ${base}/enter`,
  audit: `GET ${base}/audit-trail`,
  companyMe: "GET /api/v1/company/me",
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
  net.on(key.audit, () => ({ status: 200, body: { items: [], nextCursor: null, hasMore: false } }));
  net.on("GET /api/v1/platform/access-sessions/{sessionPublicId}/email-diagnostics/types", () => ({
    status: 200,
    body: { items: [] },
  }));
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
  vi.restoreAllMocks();
  usePlatformSession.getState().clearSession();
  useCompanySession.getState().clearSession();
});

describe("Access Session page", () => {
  it("offers the Company portal and only the areas each grant admits", async () => {
    open({ permissions: ["delegation:open", "delegation:audit:read"] });
    expect(await screen.findByText("Support session · Acme Company")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open Company portal" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Scoped audit" })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Email diagnostics" })).toBeNull();
  });

  it("signs the new tab in to the Company portal as a delegate", async () => {
    const { net } = open();
    const tab = { location: { assign: vi.fn() }, close: vi.fn() };
    vi.spyOn(window, "open").mockReturnValue(tab as unknown as Window);
    net.on(key.enter, () => ({
      status: 200,
      body: { accessToken: "delegated-token", expiresIn: 3600, companyPublicId: ids.company },
    }));
    net.on(key.companyMe, () => ({
      status: 200,
      body: {
        ...companySessionFixture({ companyPublicId: ids.company }).user,
        delegation: {
          accessSessionPublicId: ids.session,
          companyName: "Acme Company",
          reason: "SUPPORT_REQUEST",
          scope: "CHANGE",
          expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
        },
      },
    }));

    fireEvent.click(await screen.findByRole("button", { name: "Open Company portal" }));

    await waitFor(() => expect(tab.location.assign).toHaveBeenCalledWith("/company"));
    expect(net.count(key.enter)).toBe(1);
    expect(useCompanySession.getState().session?.user.delegation?.accessSessionPublicId).toBe(
      ids.session,
    );
  });

  it("closes the tab it opened when entry is refused", async () => {
    const { net } = open();
    const tab = { location: { assign: vi.fn() }, close: vi.fn() };
    vi.spyOn(window, "open").mockReturnValue(tab as unknown as Window);
    net.on(key.enter, () => ({ status: 409, body: problemBody(409) }));

    fireEvent.click(await screen.findByRole("button", { name: "Open Company portal" }));

    await waitFor(() => expect(tab.close).toHaveBeenCalled());
    expect(tab.location.assign).not.toHaveBeenCalled();
    expect(useCompanySession.getState().session).toBeNull();
  });

  it("closes terminally after confirmation", async () => {
    const { net } = open();
    net.on(key.close, () => ({
      status: 200,
      body: accessSessionBody({ status: "CLOSED", closedAt: new Date().toISOString() }),
    }));
    fireEvent.click(await screen.findByRole("button", { name: "Close session" }));
    const dialog = await screen.findByRole("dialog");
    expect(net.count(key.close)).toBe(0);
    fireEvent.click(within(dialog).getByRole("button", { name: "Close session" }));
    expect(await screen.findByText("This support session has ended")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Open Company portal" })).toBeNull();
    expect(net.count(key.close)).toBe(1);
  });

  it("treats a locally expired session as inactive", async () => {
    const { net } = open({ session: { expiresAt: "2026-01-01T00:00:00.000Z" } });
    expect(await screen.findByText("This support session has ended")).toBeInTheDocument();
    expect(screen.getByText("Expired")).toBeInTheDocument();
    expect(net.calls.filter((call) => call.audience === "delegated")).toEqual([]);
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
  });

  it("reads the scoped audit only for this session", async () => {
    const { net } = open({ area: "audit" });
    expect(await screen.findByText("No events recorded.")).toBeInTheDocument();
    expect(net.calls.find((call) => call.key === key.audit)?.input).toEqual({
      params: { sessionPublicId: ids.session },
      query: { limit: 25 },
    });
  });

  it("explains a Read only session", async () => {
    open({ session: { scope: "READ" } });
    expect(await screen.findByText(/Read only session/)).toBeInTheDocument();
  });
});
