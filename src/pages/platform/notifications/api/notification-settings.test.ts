import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  platformCommunicationsOperations as operations,
  platformPeopleOperations as people,
  platformQueryKey,
  platformReadQuery,
} from "@/shared/api";
import { usePlatformSession } from "@/shared/auth";
import { platformSessionFixture } from "../../../../test/audience-fixtures";
import { problemBody } from "../../../../test/operation-fakes";
import { operationNetwork } from "../../../../test/operation-request-mock";
import { platformNotificationSettingsBody } from "../../../../test/platform-communications-fixtures";
import { platformRolesBody } from "../../../../test/platform-people-fixtures";
import { setRouting, settingsQueries } from "../api/notification-settings";

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

describe("Platform notification settings API", () => {
  const userPublicId = platformSessionFixture().user.publicId;
  const queries = settingsQueries(userPublicId);

  beforeEach(() => {
    usePlatformSession
      .getState()
      .setSession(platformSessionFixture({ permissions: ["notification-settings"] }));
  });

  afterEach(() => {
    operationNetwork.install();
    usePlatformSession.getState().clearSession();
  });

  it("owns identity/resource keys for settings read", () => {
    expect(queries.settings.queryKey).toEqual(
      platformQueryKey(userPublicId, operations.notificationSettings),
    );
    expect(queries.settings.queryFn).toBeDefined();
  });

  it("owns identity/resource keys for roles read", () => {
    expect(queries.roles.queryKey).toEqual(platformQueryKey(userPublicId, people.roles, "routing"));
    expect(queries.roles.queryFn).toBeDefined();
  });

  it("parses notification settings response round-trip", () => {
    const body = platformNotificationSettingsBody();
    const parsed = operations.notificationSettings.responses["200"].safeParse(body);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.items).toHaveLength(3);
      expect(parsed.data.items[0].typeKey).toBe("platform.user-invited");
      expect(parsed.data.items[0].override).toBeNull();
      expect(parsed.data.items[1].override).toEqual({
        selectorKind: "role",
        selectorRef: "Platform Operator",
      });
    }
  });

  it("parses roles response round-trip", () => {
    const body = platformRolesBody();
    const parsed = people.roles.responses["200"].safeParse(body);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.items).toHaveLength(3);
      expect(parsed.data.items[0].name).toBe("SUPER_ADMIN");
      expect(parsed.data.items[0].actions).toContain("platform-roles:assign");
    }
  });

  it("sends PUT with exact override body and receives 204", async () => {
    const net = operationNetwork.install();
    net.on("GET /api/v1/platform/me", () => ({
      status: 200,
      body: platformSessionFixture({ permissions: ["notification-settings"] }).user,
    }));
    net.on(operations.updateNotificationRouting.key, () => ({ status: 204 }));

    await setRouting("platform.user-invited", { selectorKind: "role", selectorRef: "Support" });

    const call = net.calls.find((c) => c.key === operations.updateNotificationRouting.key);
    expect(call).toBeDefined();
    expect(call?.input).toEqual({
      params: { typeKey: "platform.user-invited" },
      body: { override: { selectorKind: "role", selectorRef: "Support" } },
    });
  });

  it("sends PUT with null override to clear routing", async () => {
    const net = operationNetwork.install();
    net.on("GET /api/v1/platform/me", () => ({
      status: 200,
      body: platformSessionFixture({ permissions: ["notification-settings"] }).user,
    }));
    net.on(operations.updateNotificationRouting.key, () => ({ status: 204 }));

    await setRouting("platform.company-activated", null);

    const call = net.calls.find((c) => c.key === operations.updateNotificationRouting.key);
    expect(call?.input).toEqual({
      params: { typeKey: "platform.company-activated" },
      body: { override: null },
    });
  });

  it("rejects 429 as ContractViolation", async () => {
    const net = operationNetwork.install();
    net.on("GET /api/v1/platform/me", () => ({
      status: 200,
      body: platformSessionFixture({ permissions: ["notification-settings"] }).user,
    }));
    net.on(operations.updateNotificationRouting.key, () => ({
      status: 429,
      body: problemBody(429),
    }));

    await expect(
      setRouting("platform.user-invited", { selectorKind: "role", selectorRef: "Support" }),
    ).rejects.toBeInstanceOf((await import("@/shared/api")).ContractViolation);
  });

  it("rejects malformed response as ContractViolation", async () => {
    const net = operationNetwork.install();
    net.on("GET /api/v1/platform/me", () => ({
      status: 200,
      body: platformSessionFixture({ permissions: ["notification-settings"] }).user,
    }));
    net.on(operations.updateNotificationRouting.key, () => ({
      status: 204,
      body: { unexpected: "field" },
    }));

    await expect(
      setRouting("platform.user-invited", { selectorKind: "role", selectorRef: "Support" }),
    ).rejects.toBeInstanceOf((await import("@/shared/api")).ContractViolation);
  });

  it("uses sendPlatformCommand for bodyless 204", async () => {
    const net = operationNetwork.install();
    net.on("GET /api/v1/platform/me", () => ({
      status: 200,
      body: platformSessionFixture({ permissions: ["notification-settings"] }).user,
    }));
    net.on(operations.updateNotificationRouting.key, () => ({ status: 204 }));

    await setRouting("platform.user-invited", { selectorKind: "role", selectorRef: "Support" });

    const call = net.calls.find((c) => c.key === operations.updateNotificationRouting.key);
    expect(call?.audience).toBe("platform");
  });

  it("cache key for settings is parameterless per user", () => {
    expect(platformReadQuery(userPublicId, operations.notificationSettings).queryKey).toEqual([
      "platform",
      userPublicId,
      operations.notificationSettings.key,
    ]);
  });

  it("cache key for roles includes routing suffix", () => {
    expect(platformQueryKey(userPublicId, people.roles, "routing")).toEqual([
      "platform",
      userPublicId,
      people.roles.key,
      "routing",
    ]);
  });
});
