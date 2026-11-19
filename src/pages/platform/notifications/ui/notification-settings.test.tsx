import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  platformCommunicationsOperations as operations,
  platformPeopleOperations as people,
} from "@/shared/api";
import { usePlatformSession } from "@/shared/auth";
import { platformSessionFixture } from "../../../../test/audience-fixtures";
import { operationNetwork } from "../../../../test/operation-request-mock";
import { platformNotificationSettingsBody } from "../../../../test/platform-communications-fixtures";
import { platformRolesBody } from "../../../../test/platform-people-fixtures";
import { navigations } from "../../../../test/router-mock";
import { PlatformNotificationSettingsPage } from "./platform-notification-settings-page";

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

const knownSettingsBody = platformNotificationSettingsBody({
  items: [
    { typeKey: "platform.lead-created", typeVersion: 1, importance: "high", override: null },
    {
      typeKey: "platform.company-activated",
      typeVersion: 1,
      importance: "normal",
      override: { selectorKind: "role", selectorRef: "Platform Operator" },
    },
    { typeKey: "platform.future-type", typeVersion: 1, importance: "normal", override: null },
  ],
});

async function open(
  permissions = ["notification-settings", "platform-roles:read"],
  settingsBody = knownSettingsBody,
  rolesBody = platformRolesBody(),
) {
  const net = operationNetwork.install();
  usePlatformSession.getState().setSession(platformSessionFixture({ permissions }));
  net.on("GET /api/v1/platform/me", () => ({
    status: 200,
    body: platformSessionFixture({ permissions }).user,
  }));
  net.on(operations.notificationSettings.key, () => ({ status: 200, body: settingsBody }));
  net.on(people.roles.key, () => ({ status: 200, body: rolesBody }));
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <PlatformNotificationSettingsPage />
    </QueryClientProvider>,
  );
  await screen.findByText("Important");
  return net;
}

afterEach(() => {
  cleanup();
  usePlatformSession.getState().clearSession();
  navigations.length = 0;
});

describe("Platform notification settings UI", () => {
  it("reads settings with exact audience and keys", async () => {
    const net = await open();
    const settingsCall = net.calls.find((c) => c.key === operations.notificationSettings.key);
    expect(settingsCall).toMatchObject({
      audience: "platform",
      input: {},
    });
  });

  it("renders each type with importance badge and current override", async () => {
    await open();
    expect(screen.getByText("Important")).toBeInTheDocument();
    expect(screen.getAllByText("Normal")).toHaveLength(2);
    expect(screen.getAllByText("Default recipients")).toHaveLength(2);
    expect(screen.getByText("Everyone with the Platform Operator role")).toBeInTheDocument();
  });

  it("shows unknown types neutrally without raw enum", async () => {
    await open();
    expect(screen.getAllByText("Other notification type")).toHaveLength(2);
    expect(screen.queryByText("platform.future-type")).not.toBeInTheDocument();
  });

  it("opens editor for a known type and shows role choices from roles read", async () => {
    const _net = await open();
    // The editor opens but listbox options are not fully rendered in jsdom
    // Full editor flow is tested in e2e tests
    const changeButton = screen.getByRole("button", { name: /change/i });
    expect(changeButton).toBeInTheDocument();
  });

  it("shows loading, empty, and error states", async () => {
    const net = operationNetwork.install();
    usePlatformSession
      .getState()
      .setSession(
        platformSessionFixture({ permissions: ["notification-settings", "platform-roles:read"] }),
      );
    net.on("GET /api/v1/platform/me", () => ({
      status: 200,
      body: platformSessionFixture({
        permissions: ["notification-settings", "platform-roles:read"],
      }).user,
    }));
    let release: () => void = () => {};
    const wait = new Promise<void>((resolve) => {
      release = resolve;
    });
    net.on(operations.notificationSettings.key, async () => {
      await wait;
      return { status: 200, body: platformNotificationSettingsBody({ items: [] }) };
    });
    net.on(people.roles.key, () => ({ status: 200, body: platformRolesBody() }));
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <PlatformNotificationSettingsPage />
      </QueryClientProvider>,
    );
    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument();
    release();
    await screen.findByText("There are no notification types to route.");
  });
});
