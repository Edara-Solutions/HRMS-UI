import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { platformLeadOperations as operations } from "@/shared/api";
import { usePlatformSession } from "@/shared/auth";
import { platformSessionFixture } from "../../../../test/audience-fixtures";
import { operationNetwork } from "../../../../test/operation-request-mock";
import {
  approvedBody,
  conversionBody,
  leadIds,
  leadPermissions,
  pageMeta,
} from "../../../../test/platform-lead-fixtures";
import { navigations } from "../../../../test/router-mock";
import type { RequestSearch } from "../model/page-search";
import { PlatformConversionRequestsPage } from "./crm-requests-page";

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

const tableRow = async (text: string) =>
  (await screen.findAllByText(text))
    .map((element) => element.closest("tr"))
    .find((row): row is HTMLTableRowElement => row !== null) as HTMLElement;

const person = (firstName: string, lastName: string) => ({
  publicId: leadIds.other,
  firstName,
  lastName,
  email: `${firstName.toLowerCase()}@private.test`,
});

function open(body: unknown, search: Partial<RequestSearch> = {}) {
  const net = operationNetwork.install();
  usePlatformSession
    .getState()
    .setSession(platformSessionFixture({ permissions: leadPermissions }));
  net.on(operations.requests.key, () => ({ status: 200, body }));
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <PlatformConversionRequestsPage search={{ page: 1, pageSize: 10, ...search }} />
    </QueryClientProvider>,
  );
  return net;
}

afterEach(() => {
  cleanup();
  usePlatformSession.getState().clearSession();
  navigations.length = 0;
});

describe("Conversion requests list", () => {
  it("shows the requester and decision by name, never their email", async () => {
    open({
      items: [
        approvedBody({
          requester: person("Rana", "Requester"),
          approvedBy: person("Adam", "Approver"),
        }),
      ],
      meta: pageMeta(),
    });
    const row = await tableRow("Rana Requester");
    expect(within(row).getByText("Adam Approver")).toBeInTheDocument();
    expect(within(row).getByText("Approved")).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("@private.test");
    expect(screen.getByText("1 requests")).toBeInTheDocument();
  });

  it("leaves the decision empty while a request is pending", async () => {
    open({ items: [conversionBody({ status: "PENDING" })], meta: pageMeta() });
    const row = await tableRow("Pending");
    expect(within(row).getAllByText("—").length).toBeGreaterThan(0);
  });

  it("filters by status from the first page", async () => {
    open({ items: [conversionBody()], meta: pageMeta() }, { page: 3 });
    await screen.findAllByText("Pending");
    fireEvent.click(screen.getByRole("combobox", { name: "Status" }));
    fireEvent.click(screen.getByRole("option", { name: "Rejected" }));
    expect(navigations.at(-1)).toMatchObject({
      to: "/platform/conversion-requests",
      search: { status: "REJECTED", page: 1 },
    });
  });

  it("resets every filter but keeps the page size from the empty state", async () => {
    open({ items: [], meta: pageMeta() }, { status: "APPROVED", pageSize: 25 });
    await screen.findByText("No conversion requests");
    fireEvent.click(screen.getAllByRole("button", { name: "Reset" }).at(-1) as HTMLElement);
    expect(navigations.at(-1)).toEqual({
      to: "/platform/conversion-requests",
      search: { page: 1, pageSize: 25 },
    });
  });

  it("does not render a response that fails the contract", async () => {
    open({ items: [{ publicId: "not-a-request" }], meta: pageMeta() });
    expect(
      await screen.findByText("The response could not be verified. This section is unavailable."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
  });
});
