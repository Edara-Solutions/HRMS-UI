import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { platformCommunicationsOperations as operations } from "@/shared/api";
import {
  migrateResultBody,
  platformCommunicationsPermissions,
  platformEmailTypesBody,
  platformVariantsBody,
  removalReadinessBody,
} from "../../../../test/platform-communications-fixtures";
import { communicationsRender } from "../../../../test/platform-communications-render";
import { VariantMigration } from "./variant-migration";

const type = platformEmailTypesBody().items[0];
for (const stale of [false, true])
  it(`confirms approved replacement and ${stale ? "rejects stale aggregates" : "migrates current assignments"}`, async () => {
    const { network, show } = communicationsRender(
      <VariantMigration type={type} />,
      platformCommunicationsPermissions.emailTemplates,
    );
    network.on(operations.emailVariants.key, () => ({ status: 200, body: platformVariantsBody() }));
    let reads = 0;
    network.on(operations.variantRemovalReadiness.key, () => ({
      status: 200,
      body: removalReadinessBody({
        activeAssignments: stale && ++reads > 1 ? 5 : 3,
        removable: false,
        pendingMessages: 0,
      }),
    }));
    network.on(operations.migrateVariant.key, () => ({ status: 200, body: migrateResultBody() }));
    show();
    await screen.findByRole("option", { name: "invitation.legacy" });
    await userEvent.selectOptions(screen.getByLabelText("Legacy variant"), "invitation.legacy");
    await screen.findByText("3");
    await userEvent.selectOptions(screen.getByLabelText("Approved replacement"), "invitation.warm");
    await userEvent.type(screen.getByLabelText("Operator reason"), "Retire legacy revision");
    await userEvent.click(screen.getByRole("button", { name: "Migrate" }));
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent("invitation.legacy → invitation.warm");
    await userEvent.click(within(dialog).getByRole("button", { name: "Migrate" }));
    if (stale) {
      await screen.findByText("The state changed. Reconcile before continuing.");
      expect(network.count(operations.migrateVariant.key)).toBe(0);
    } else {
      await screen.findByText("Action completed.");
      expect(
        network.calls.find((call) => call.key === operations.migrateVariant.key)?.input,
      ).toEqual({
        params: { key: "invitation.legacy" },
        body: { toRevisionKey: "invitation.warm", reason: "Retire legacy revision" },
      });
    }
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
