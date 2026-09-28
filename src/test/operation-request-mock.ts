import { vi } from "vitest";
import { createOperationNetwork } from "./operation-fakes";

/** The network the mocked transport routes to; each test installs a fresh one. */
export const operationNetwork = {
  current: createOperationNetwork(),
  install() {
    this.current = createOperationNetwork();
    return this.current;
  },
};

// Importing this module swaps only the transport; contracts, refusals and callers stay real.
vi.mock("../shared/api/operation-request", async (original) => {
  const actual = await original<typeof import("../shared/api/operation-request")>();
  return {
    ...actual,
    executeOperationRequest: (client: never, operation: never, input: unknown) =>
      operationNetwork.current.execute(client, operation, input, actual.OperationRefusal),
  };
});
