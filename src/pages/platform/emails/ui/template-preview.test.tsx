import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { platformCommunicationsOperations as operations } from "@/shared/api";
import {
  platformEmailTypesBody,
  platformPreviewBody,
} from "../../../../test/platform-communications-fixtures";
import { communicationsRender } from "../../../../test/platform-communications-render";
import { TemplatePreview } from "./template-preview";

const type = platformEmailTypesBody().items[0];
it("isolates executable and remote content in the synthetic preview", async () => {
  const { network, show } = communicationsRender(<TemplatePreview type={type} />, [
    "email-templates:preview",
  ]);
  network.on(operations.emailPreview.key, () => ({ status: 200, body: platformPreviewBody() }));
  show();
  await screen.findByText("You are invited to the team");
  const frame = screen.getByTitle("Preview: You are invited to the team");
  expect(frame).toHaveAttribute("sandbox", "");
  expect(frame.getAttribute("srcdoc")).not.toContain("evil.test");
  expect(frame.getAttribute("srcdoc")).not.toContain("<script>");
});
it("rejects a preview from another email context", async () => {
  const { network, show } = communicationsRender(<TemplatePreview type={type} />, [
    "email-templates:preview",
  ]);
  network.on(operations.emailPreview.key, () => ({
    status: 200,
    body: { ...platformPreviewBody(), context: "COMPANY", subject: "foreign-canary" },
  }));
  show();
  await screen.findByText("The server contract has changed. Reload the page to continue.");
  expect(document.body).not.toHaveTextContent("foreign-canary");
});
it("keys each requested preview locale", async () => {
  const { network, show } = communicationsRender(<TemplatePreview type={type} />, [
    "email-templates:preview",
  ]);
  network.on(operations.emailPreview.key, (input) => ({
    status: 200,
    body: platformPreviewBody(JSON.stringify(input).includes('"locale":"ar"') ? "ar" : "en"),
  }));
  show();
  await screen.findByText("You are invited to the team");
  await userEvent.click(screen.getByRole("button", { name: "Arabic" }));
  await screen.findByText("دعوة إلى الفريق");
  expect(network.calls.at(-1)?.input).toEqual({
    params: { key: type.key },
    query: { locale: "ar" },
  });
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
