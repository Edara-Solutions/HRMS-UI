import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { usePlatformSession } from "@/shared/auth";
import { platformSessionFixture } from "../../../../test/audience-fixtures";
import { problemBody } from "../../../../test/operation-fakes";
import { operationNetwork } from "../../../../test/operation-request-mock";
import {
  platformAdministrator,
  platformCanaries,
  platformIds,
  platformPersonBody,
  platformRolesBody,
  platformRosterBody,
  rootAuthority,
} from "../../../../test/platform-people-fixtures";
import { navigations } from "../../../../test/router-mock";
import { PlatformPeoplePage } from "./people-page";

function renderRoster({
  root = false,
  permissions = platformAdministrator as readonly string[],
  roster = platformRosterBody([platformIds.actor, platformIds.colleague]) as unknown,
} = {}) {
  const net = operationNetwork.install();
  net.on("GET /api/v1/platform/users", () => ({ status: 200, body: roster }));
  net.on("GET /api/v1/platform/roles", () => ({ status: 200, body: platformRolesBody() }));
  navigations.length = 0;
  usePlatformSession.getState().setSession(
    platformSessionFixture({
      publicId: platformIds.actor,
      roleNames: root ? ["SUPER_ADMIN"] : ["Support"],
      permissions: [...permissions],
    }),
  );
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <PlatformPeoplePage search={{}} />
    </QueryClientProvider>,
  );
  return net;
}

afterEach(() => {
  cleanup();
  usePlatformSession.getState().clearSession();
});

function fillInvitation() {
  fireEvent.change(screen.getByLabelText("First name"), { target: { value: "Mona" } });
  fireEvent.change(screen.getByLabelText("Last name"), { target: { value: "Samir" } });
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "mona@edara.test" } });
}

describe("Platform roster", () => {
  it("reads the roster through the Platform audience only", async () => {
    const net = renderRoster();
    expect(await screen.findByText("Omar Nabil")).toBeInTheDocument();
    expect(screen.getByText("You")).toBeInTheDocument();
    expect(net.calls.every((call) => call.audience === "platform")).toBe(true);
    expect(net.calls[0]?.input).toEqual({ query: { page: 1, pageSize: 20 } });
  });

  it("invites without an implicit role when the inviter is not root", async () => {
    const net = renderRoster();
    net.on("POST /api/v1/platform/users", () => ({
      status: 201,
      body: platformPersonBody(platformIds.pending),
    }));
    fireEvent.click(await screen.findByRole("button", { name: "Invite person" }));
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("start with no role");
    expect(within(dialog).queryByText("Initial roles")).toBeNull();
    fillInvitation();
    fireEvent.click(within(dialog).getByRole("button", { name: "Send invitation" }));
    await waitFor(() =>
      expect(navigations).toEqual([
        { to: "/platform/people/$publicId", params: { publicId: platformIds.pending } },
      ]),
    );
    expect(net.calls.find((call) => call.key.startsWith("POST"))?.input).toEqual({
      body: { firstName: "Mona", lastName: "Samir", email: "mona@edara.test" },
    });
    expect(net.count("GET /api/v1/platform/roles")).toBe(0);
  });

  it("offers initial roles only to a root holder with the reserved assign action", async () => {
    const net = renderRoster({
      root: true,
      permissions: [...platformAdministrator, ...rootAuthority],
    });
    net.on("POST /api/v1/platform/users", () => ({
      status: 201,
      body: platformPersonBody(platformIds.pending),
    }));
    fireEvent.click(await screen.findByRole("button", { name: "Invite person" }));
    fillInvitation();
    fireEvent.click(await screen.findByRole("checkbox", { name: "Auditor" }));
    fireEvent.click(screen.getByRole("button", { name: "Send invitation" }));
    await waitFor(() => expect(net.count("POST /api/v1/platform/users")).toBe(1));
    expect(net.calls.find((call) => call.key.startsWith("POST"))?.input).toMatchObject({
      body: { rolePublicIds: [platformIds.auditorRole] },
    });
  });

  it("maps a rejected field and keeps backend text out of the page", async () => {
    const net = renderRoster();
    net.on("POST /api/v1/platform/users", () => ({
      status: 400,
      body: problemBody(400, { invalidParams: ["/email"] }),
    }));
    fireEvent.click(await screen.findByRole("button", { name: "Invite person" }));
    fillInvitation();
    fireEvent.click(screen.getByRole("button", { name: "Send invitation" }));
    expect(await screen.findByText("This value was not accepted.")).toBeInTheDocument();
    expect(net.count("POST /api/v1/platform/users")).toBe(1);
    for (const canary of platformCanaries) expect(document.body.textContent).not.toContain(canary);
  });

  it("hides invitation without the invite permission", async () => {
    renderRoster({ permissions: ["platform-users:read"] });
    expect(await screen.findByText("Omar Nabil")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Invite person" })).toBeNull();
  });

  it("shows the contract-unavailable state for a malformed roster", async () => {
    renderRoster({ roster: { items: [{ publicId: "x" }] } });
    expect(
      await screen.findByText(
        "This information is temporarily unavailable. Actions that depend on it are paused.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
  });
});
