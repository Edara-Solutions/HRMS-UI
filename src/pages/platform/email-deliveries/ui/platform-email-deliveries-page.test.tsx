import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import {
  platformCommunicationsOperations as operations,
  platformCompanyOperations,
} from "@/shared/api";
import {
  deliveriesBody,
  deliveryBody,
  platformCommunicationsIds,
  platformCommunicationsPermissions,
  platformEmailTypesBody,
} from "../../../../test/platform-communications-fixtures";
import {
  communicationsRender,
  navigationCalls,
  searchState,
} from "../../../../test/platform-communications-render";
import { companyListBody } from "../../../../test/platform-company-fixtures";
import { PlatformEmailDeliveriesPage } from "./platform-email-deliveries-page";

it("finds Company and Email Type by readable names while submitting contract IDs", async () => {
  const { network, show } = communicationsRender(<PlatformEmailDeliveriesPage />, [
    ...platformCommunicationsPermissions.deliveries,
    "companies:read",
    "email-types:read",
  ]);
  network.on(operations.deliveries.key, () => ({ status: 200, body: deliveriesBody() }));
  network.on(platformCompanyOperations.companies.key, () => ({
    status: 200,
    body: companyListBody(),
  }));
  network.on(operations.emailTypes.key, () => ({
    status: 200,
    body: platformEmailTypesBody(),
  }));
  show();
  const user = userEvent.setup();
  const company = screen.getByRole("combobox", { name: "Company" });
  await user.click(company);
  await user.type(company, "Acme");
  await user.click(await screen.findByRole("option", { name: /Acme Company/ }));
  const emailType = screen.getByRole("combobox", { name: "Email type" });
  await user.click(emailType);
  await user.type(emailType, "invitation");
  await user.click(await screen.findByRole("option", { name: /Company invitation email/ }));
  await user.click(screen.getByRole("button", { name: "Search deliveries" }));
  await waitFor(() => expect(navigationCalls).toHaveLength(1));
  expect(navigationCalls[0]).toMatchObject({
    href: expect.stringContaining(`companyPublicId=${companyListBody().data[0].publicId}`),
  });
  expect(navigationCalls[0]).toMatchObject({
    href: expect.stringContaining("emailTypeKey=edara.company-invitation"),
  });
});

it("keeps delivery filtering available without catalogue permissions", async () => {
  const { network, show } = communicationsRender(
    <PlatformEmailDeliveriesPage />,
    platformCommunicationsPermissions.deliveries,
  );
  network.on(operations.deliveries.key, () => ({ status: 200, body: deliveriesBody() }));
  show();
  expect(await screen.findByRole("textbox", { name: "Company" })).toBeInTheDocument();
  expect(screen.getByRole("textbox", { name: "Email type" })).toBeInTheDocument();
  expect(network.count(platformCompanyOperations.companies.key)).toBe(0);
  expect(network.count(operations.emailTypes.key)).toBe(0);
});

it("renders only the minimized declared operational projection", async () => {
  searchState.deliveryId = platformCommunicationsIds.companyDeliveryId;
  searchState.deliveryContext = "COMPANY";
  const { network, show } = communicationsRender(
    <PlatformEmailDeliveriesPage />,
    platformCommunicationsPermissions.deliveries,
  );
  network.on(operations.deliveries.key, () => ({ status: 200, body: deliveriesBody() }));
  network.on(operations.delivery.key, () => ({
    status: 200,
    body: deliveryBody({
      lastFailureKind: "failure-kind-canary",
      businessReference: "business-canary",
    }),
  }));
  show();
  await screen.findByRole("columnheader", { name: "Email type" });
  expect(screen.getByRole("columnheader", { name: "Attempts" })).toBeInTheDocument();
  const dialog = await screen.findByRole("dialog");
  await within(dialog).findByText("s***@company.test");
  expect(document.body).not.toHaveTextContent("provider-message-canary");
  expect(document.body).not.toHaveTextContent("failure-kind-canary");
  expect(document.body).not.toHaveTextContent("business-canary");
  expect(network.calls.find((call) => call.key === operations.delivery.key)?.input).toEqual({
    params: { context: "COMPANY", publicId: platformCommunicationsIds.companyDeliveryId },
  });
});
it("conceals a response returned for the wrong context", async () => {
  searchState.deliveryId = platformCommunicationsIds.companyDeliveryId;
  searchState.deliveryContext = "COMPANY";
  const { network, show } = communicationsRender(
    <PlatformEmailDeliveriesPage />,
    platformCommunicationsPermissions.deliveries,
  );
  network.on(operations.deliveries.key, () => ({
    status: 200,
    body: {
      items: [],
      meta: { mode: "page", page: 1, pageSize: 25, totalItems: 0, totalPages: 0 },
    },
  }));
  network.on(operations.delivery.key, () => ({
    status: 200,
    body: deliveryBody({ context: "EDARA", maskedRecipient: "foreign-canary" }),
  }));
  show();
  await screen.findByText("The response could not be verified. This section is unavailable.");
  expect(document.body).not.toHaveTextContent("foreign-canary");
});
for (const stale of [false, true])
  it(`rechecks retry state and ${stale ? "blocks stale writes" : "sends a bounded command"}`, async () => {
    searchState.deliveryId = platformCommunicationsIds.companyDeliveryId;
    searchState.deliveryContext = "COMPANY";
    let reads = 0;
    const { network, show } = communicationsRender(
      <PlatformEmailDeliveriesPage />,
      platformCommunicationsPermissions.deliveries,
    );
    network.on(operations.deliveries.key, () => ({ status: 200, body: deliveriesBody() }));
    network.on(operations.delivery.key, () => ({
      status: 200,
      body: deliveryBody({ status: stale && ++reads > 1 ? "SENT" : "FAILED" }),
    }));
    network.on(operations.retryDelivery.key, () => ({
      status: 200,
      body: deliveryBody({ status: "QUEUED" }),
    }));
    show();
    const detail = await screen.findByRole("dialog");
    await userEvent.click(await within(detail).findByRole("button", { name: "Retry delivery" }));
    const dialogs = screen.getAllByRole("dialog");
    const confirm = dialogs[dialogs.length - 1];
    await userEvent.type(within(confirm).getByLabelText("Operator reason"), "Retry after repair");
    await userEvent.click(within(confirm).getByRole("button", { name: "Retry delivery" }));
    await screen.findByText(
      stale ? "The state changed. Reconcile before continuing." : "Action completed.",
    );
    expect(network.count(operations.retryDelivery.key)).toBe(stale ? 0 : 1);
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
