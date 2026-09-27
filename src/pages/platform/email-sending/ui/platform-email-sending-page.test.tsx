import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { platformCommunicationsOperations as operations } from "@/shared/api";
import { sendingBody } from "../../../../test/platform-communications-fixtures";
import { communicationsRender } from "../../../../test/platform-communications-render";
import { PlatformEmailSendingPage } from "./platform-email-sending-page";

for (const paused of [false, true])
  it(`confirms and changes only the ${paused ? "paused" : "running"} context`, async () => {
    const { network, show } = communicationsRender(<PlatformEmailSendingPage />, [
      "emails:sending:read",
      "emails:sending:pause",
      "emails:sending:resume",
    ]);
    let changed = false;
    network.on(operations.sendingStatus.key, () => ({
      status: 200,
      body: sendingBody({
        items: [
          {
            context: "EDARA",
            paused: changed ? !paused : paused,
            reason: null,
            updatedAt: null,
            updatedBy: 12345,
          },
        ],
      }),
    }));
    const operation = paused ? operations.resumeSending : operations.pauseSending;
    network.on(operation.key, () => {
      changed = true;
      return {
        status: 200,
        body: {
          context: "EDARA",
          paused: !paused,
          reason: null,
          updatedAt: null,
          updatedBy: 12345,
        },
      };
    });
    show();
    await userEvent.click(
      await screen.findByRole("button", { name: paused ? "Resume sending" : "Pause sending" }),
    );
    const dialog = screen.getByRole("dialog");
    if (!paused) {
      expect(within(dialog).getByRole("button", { name: "Confirm" })).toBeDisabled();
      await userEvent.type(
        within(dialog).getByLabelText("Operator reason"),
        "Investigating incident",
      );
    }
    await userEvent.click(within(dialog).getByRole("button", { name: "Confirm" }));
    await screen.findByText("Action completed.");
    expect(network.calls.find((call) => call.key === operation.key)?.input).toEqual(
      paused
        ? { params: { context: "EDARA" } }
        : { params: { context: "EDARA" }, body: { reason: "Investigating incident" } },
    );
    expect(document.body).not.toHaveTextContent("12345");
  });
it("does not invent absent sending contexts", async () => {
  const { network, show } = communicationsRender(<PlatformEmailSendingPage />, [
    "emails:sending:read",
  ]);
  network.on(operations.sendingStatus.key, () => ({ status: 200, body: { items: [] } }));
  show();
  await screen.findByText("Sending is not configured.");
  expect(screen.queryByRole("button", { name: "Pause sending" })).not.toBeInTheDocument();
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
