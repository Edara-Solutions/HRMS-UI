import { screen, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { platformCommunicationsOperations as operations } from "@/shared/api";
import { platformEmailTypesBody } from "../../../../test/platform-communications-fixtures";
import { communicationsRender } from "../../../../test/platform-communications-render";
import { PlatformEmailsPage } from "./platform-emails-page";

it("limits the interactive catalogue to Platform email types", async () => {
  const { network, show } = communicationsRender(<PlatformEmailsPage />, ["email-types:read"]);
  network.on(operations.emailTypes.key, () => ({ status: 200, body: platformEmailTypesBody() }));
  show();
  const type = await screen.findByRole("button", { name: "Company invitation email" });
  expect(within(type).getByText("Edara")).toBeInTheDocument();
  expect(within(type).getByText("Critical")).toBeInTheDocument();
  expect(screen.queryByText("Payslip ready")).not.toBeInTheDocument();
  expect(network.calls.every((call) => call.audience === "platform")).toBe(true);
});
it("withholds the route and performs no reads without permission", () => {
  const { network, show } = communicationsRender(<PlatformEmailsPage />, []);
  show();
  expect(screen.getByText("Refused route")).toBeInTheDocument();
  expect(network.calls).toHaveLength(0);
});
it("keeps contract failures bounded", async () => {
  const { network, show } = communicationsRender(<PlatformEmailsPage />, ["email-types:read"]);
  network.on(operations.emailTypes.key, () => ({
    status: 200,
    body: { items: [{ secret: "secret-canary" }] },
  }));
  show();
  await screen.findByText("The server contract has changed. Reload the page to continue.");
  expect(document.body).not.toHaveTextContent("secret-canary");
});

import { operationNetwork } from "../../../../test/operation-request-mock";

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
