import { QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ContractViolation } from "@/shared/api";
import { useCompanySession } from "@/shared/auth";
import { companySessionFixture } from "../../../../test/audience-fixtures";
import { emailTypesBody } from "../../../../test/company-communications-fixtures";
import { operationNetwork } from "../../../../test/operation-request-mock";
import { emailTemplateQueries } from "./email-templates";

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

afterEach(() => useCompanySession.getState().clearSession());

describe("Company email type detail", () => {
  it("requests the selected key under the current Company identity", async () => {
    const net = operationNetwork.install();
    const type = emailTypesBody().items[0];
    const session = companySessionFixture();
    useCompanySession.getState().setSession(session);
    net.on("GET /api/v1/company/email-types/{key}", () => ({ status: 200, body: type }));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    expect(
      await client.fetchQuery(emailTemplateQueries(session.user.publicId).detail(type.key)),
    ).toEqual(type);
    expect(net.calls[0]?.input).toEqual({ params: { key: type.key } });
    client.clear();
  });
  it.each([
    { key: "other.type" },
    { context: "EDARA" },
  ])("refuses a detail response that belongs to another key or context: %s", async (replacement) => {
    const net = operationNetwork.install();
    const type = emailTypesBody().items[0];
    const session = companySessionFixture();
    useCompanySession.getState().setSession(session);
    net.on("GET /api/v1/company/email-types/{key}", () => ({
      status: 200,
      body: { ...type, ...replacement },
    }));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    await expect(
      client.fetchQuery(emailTemplateQueries(session.user.publicId).detail(type.key)),
    ).rejects.toBeInstanceOf(ContractViolation);
    client.clear();
  });
});
