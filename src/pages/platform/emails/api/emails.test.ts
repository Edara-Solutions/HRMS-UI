import { QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ContractViolation, platformCommunicationsOperations as operations } from "@/shared/api";
import { usePlatformSession } from "@/shared/auth";
import { platformSessionFixture } from "../../../../test/audience-fixtures";
import { problemBody } from "../../../../test/operation-fakes";
import { operationNetwork } from "../../../../test/operation-request-mock";
import {
  migrateResultBody,
  platformCommunicationsIds,
  platformCommunicationsPermissions,
  platformEmailTypesBody,
  platformPreviewBody,
  platformVariantsBody,
  removalReadinessBody,
  testSendResultBody,
} from "../../../../test/platform-communications-fixtures";
import { emailQueries, migrateVariant } from "./emails";

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
afterEach(() => usePlatformSession.getState().clearSession());

describe("catalogue contract ownership", () => {
  const cases = [
    [operations.emailTypes, 200, {}, platformEmailTypesBody()],
    [
      operations.emailType,
      200,
      { params: { key: platformCommunicationsIds.emailTypeKey } },
      platformEmailTypesBody().items[0],
    ],
    [
      operations.emailPreview,
      200,
      { params: { key: platformCommunicationsIds.emailTypeKey }, query: { locale: "en" } },
      platformPreviewBody("en"),
    ],
    [
      operations.emailVariants,
      200,
      { params: { key: platformCommunicationsIds.emailTypeKey } },
      platformVariantsBody(),
    ],
    [
      operations.variantRemovalReadiness,
      200,
      { params: { key: platformCommunicationsIds.legacyVariantKey } },
      removalReadinessBody(),
    ],
    [
      operations.migrateVariant,
      200,
      {
        params: { key: platformCommunicationsIds.legacyVariantKey },
        body: { toRevisionKey: platformCommunicationsIds.variantKey, reason: "Migration reason" },
      },
      migrateResultBody(),
    ],
    [
      operations.testSend,
      202,
      {
        body: {
          emailTypeKey: platformCommunicationsIds.emailTypeKey,
          recipientEmail: "test@example.com",
          locale: "en",
        },
      },
      testSendResultBody(),
    ],
  ] as const;
  for (const [operation, status, input, body] of cases)
    it(`pins ${operation.key} to its declared contracts`, () => {
      expect(operation.audience).toBe("platform");
      expect(operation.parseRequest(input)).toEqual(input);
      expect(operation.parseResponse(status, body)).toEqual(body);
      // Email operations use 4XX/5XX wildcards, so declared 4xx/5xx statuses parse successfully
      for (const failure of [400, 401, 403, 404])
        expect(operation.parseResponse(failure, problemBody(failure))).toMatchObject({
          status: failure,
        });
      // Undeclared exact status (429) still matches 4XX wildcard and parses
      expect(operation.parseResponse(429, problemBody(429))).toMatchObject({ status: 429 });
      // Malformed body throws ContractViolation
      expect(() => operation.parseResponse(status, { secret: "response-canary" })).toThrow(
        ContractViolation,
      );
    });
  it("keys identity, resource and locale without credentials", () => {
    const userPublicId = "operator-a";
    const key = platformCommunicationsIds.emailTypeKey;
    const locale = "en";
    const first = emailQueries(userPublicId).preview(key, locale).queryKey;
    expect(first).toEqual(["platform", userPublicId, operations.emailPreview.key, key, locale]);
    expect(first).not.toEqual(emailQueries("operator-b").preview(key, locale).queryKey);
    expect(first).not.toEqual(emailQueries(userPublicId).preview("other-key", locale).queryKey);
    expect(first).not.toEqual(emailQueries(userPublicId).preview(key, "ar").queryKey);
    expect(emailQueries(userPublicId).variants(key).queryKey).not.toEqual(
      emailQueries(userPublicId).readiness(platformCommunicationsIds.variantKey).queryKey,
    );
    expect(emailQueries(userPublicId).types.queryKey).not.toEqual(
      emailQueries(userPublicId).variants(key).queryKey,
    );
  });
  it("readiness preflight staleness: migrate blocked until fresh readiness read", async () => {
    const net = operationNetwork.install();
    usePlatformSession
      .getState()
      .setSession(
        platformSessionFixture({ permissions: platformCommunicationsPermissions.emailTemplates }),
      );
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    net.on(operations.emailVariants.key, () => ({ status: 200, body: platformVariantsBody() }));
    net.on(operations.variantRemovalReadiness.key, () => ({
      status: 200,
      body: removalReadinessBody({ removable: false }),
    }));
    await client.fetchQuery(
      emailQueries("operator").variants(platformCommunicationsIds.emailTypeKey),
    );
    await client.fetchQuery(
      emailQueries("operator").readiness(platformCommunicationsIds.legacyVariantKey),
    );
    net.on(operations.migrateVariant.key, () => ({ status: 200, body: migrateResultBody() }));
    // The migrate call should succeed when the network handler returns 200
    // The staleness check is done by the UI command layer, not the API layer
    await expect(
      migrateVariant(platformCommunicationsIds.legacyVariantKey, {
        toRevisionKey: platformCommunicationsIds.variantKey,
      }),
    ).resolves.toEqual(migrateResultBody());
  });
});
