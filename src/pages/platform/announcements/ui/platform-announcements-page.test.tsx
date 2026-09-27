import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import {
  platformCommunicationsOperations as operations,
  platformCompanyOperations,
} from "@/shared/api";
import { operationNetwork } from "../../../../test/operation-request-mock";
import {
  announcementBody,
  platformCommunicationsPermissions,
} from "../../../../test/platform-communications-fixtures";
import { communicationsRender } from "../../../../test/platform-communications-render";
import { companyListBody } from "../../../../test/platform-company-fixtures";
import { PlatformAnnouncementsPage } from "./platform-announcements-page";

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
it("keeps partial dispatch, unfinished time and distinct reach separate", async () => {
  const { network, show } = communicationsRender(<PlatformAnnouncementsPage />, [
    "announcements:read",
  ]);
  network.on(operations.announcements.key, () => ({
    status: 200,
    body: {
      items: [
        announcementBody({
          status: "PARTIAL",
          dispatchFinishedAt: null,
          pendingUnits: 2,
          failedUnits: 1,
        }),
      ],
    },
  }));
  show();
  await screen.findByText("Partial");
  expect(screen.getByText("Distinct Companies reached")).toBeInTheDocument();
  expect(screen.getByText("Distinct recipients reached")).toBeInTheDocument();
  expect(screen.getByText("Dispatch finished at").parentElement).toHaveTextContent("Not recorded");
  expect(screen.queryByRole("button", { name: "Compose announcement" })).not.toBeInTheDocument();
});
it("holds bilingual content and exact scopes for review before publishing", async () => {
  const { network, show } = communicationsRender(<PlatformAnnouncementsPage />, [
    ...platformCommunicationsPermissions.announcements,
    "companies:read",
  ]);
  network.on(operations.announcements.key, () => ({ status: 200, body: { items: [] } }));
  network.on(platformCompanyOperations.companies.key, () => ({
    status: 200,
    body: companyListBody(),
  }));
  network.on(operations.createAnnouncement.key, () => ({
    status: 201,
    body: { publicId: announcementBody().publicId, status: "DISPATCHING", scheduledFor: null },
  }));
  show();
  await userEvent.click(await screen.findByRole("button", { name: "Compose announcement" }));
  const composer = screen.getByRole("dialog");
  const fields = within(composer).getAllByLabelText("Title");
  await userEvent.type(fields[0], "Maintenance");
  await userEvent.type(fields[1], "صيانة");
  const bodies = within(composer).getAllByLabelText("Message");
  await userEvent.type(bodies[0], "Planned maintenance");
  await userEvent.type(bodies[1], "صيانة مجدولة");
  await userEvent.click(await within(composer).findByRole("checkbox"));
  await userEvent.click(within(composer).getByRole("button", { name: "Review announcement" }));
  expect(network.count(operations.createAnnouncement.key)).toBe(0);
  const confirm = screen.getAllByRole("dialog").at(-1);
  if (!confirm) throw new Error("Missing review");
  expect(confirm).toHaveTextContent("Maintenance");
  expect(confirm).toHaveTextContent("صيانة");
  await userEvent.click(within(confirm).getByRole("button", { name: "Publish announcement" }));
  await screen.findByText("No announcements.");
  expect(
    network.calls.find((call) => call.key === operations.createAnnouncement.key)?.input,
  ).toMatchObject({ body: { rules: [{ scope: "company", selector: { kind: "blast" } }] } });
});
