import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { platformCommunicationsOperations as operations } from "@/shared/api";
import { problemBody } from "../../../../test/operation-fakes";
import {
  platformEmailTypesBody,
  testSendResultBody,
} from "../../../../test/platform-communications-fixtures";
import { communicationsRender } from "../../../../test/platform-communications-render";
import { TestSendForm } from "./test-send-form";

const type = platformEmailTypesBody().items[0];
it("queues only a synthetic test contract", async () => {
  const { network, show } = communicationsRender(<TestSendForm type={type} />, [
    "emails:test-send",
  ]);
  network.on(operations.testSend.key, () => ({ status: 202, body: testSendResultBody() }));
  show();
  await userEvent.click(screen.getByRole("button", { name: "Send test" }));
  await screen.findByText("Action completed.");
  expect(network.calls[0]?.input).toMatchObject({ body: { emailTypeKey: type.key, locale: "en" } });
  expect(network.calls[0]?.input).not.toHaveProperty("body.payload");
});
for (const status of [400, 403, 409, 429, 500])
  it(`preserves input and requires reconciliation after ${status}`, async () => {
    const { network, show } = communicationsRender(<TestSendForm type={type} />, [
      "emails:test-send",
    ]);
    network.on(operations.testSend.key, () => ({ status, body: problemBody(status) }));
    network.on("GET /api/v1/platform/me", () => ({
      status: 200,
      body: { ...testSendResultBody(), invalid: true },
    }));
    show();
    await userEvent.click(screen.getByRole("button", { name: "Send test" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Send test" })).toBeDisabled());
    expect(network.count(operations.testSend.key)).toBe(1);
    expect(document.body).not.toHaveTextContent("internal-detail-canary");
  });
it("has no Company test-send control", () => {
  const { network, show } = communicationsRender(
    <TestSendForm type={platformEmailTypesBody().items[1]} />,
    ["emails:test-send"],
  );
  show();
  expect(screen.queryByRole("button", { name: "Send test" })).not.toBeInTheDocument();
  expect(network.calls).toHaveLength(0);
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
it("retains the draft and blocks replay when the network outcome is unknown", async () => {
  const { network, show } = communicationsRender(<TestSendForm type={type} />, [
    "emails:test-send",
  ]);
  network.on(operations.testSend.key, () => {
    throw new TypeError("network-canary");
  });
  show();
  await userEvent.click(screen.getByRole("button", { name: "Send test" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Send test" })).toBeDisabled());
  expect(network.count(operations.testSend.key)).toBe(1);
  expect(document.body).not.toHaveTextContent("network-canary");
  await userEvent.click(screen.getByRole("button", { name: "Send test" }));
  expect(network.count(operations.testSend.key)).toBe(1);
});
