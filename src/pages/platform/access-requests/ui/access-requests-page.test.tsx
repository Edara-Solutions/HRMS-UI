import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { usePlatformSession } from "@/shared/auth";
import { platformSessionFixture } from "../../../../test/audience-fixtures";
import { operationNetwork } from "../../../../test/operation-request-mock";
import {
  accessRequestBody,
  accessRequestIds,
  accessSessionBody,
  accessSessionIds,
} from "../../../../test/platform-access-session-fixtures";
import type { AccessTab } from "../model/page-search";
import { PlatformAccessRequestsPage } from "./access-requests-page";

const approverPermissions = ["delegation:open", "delegation:approve"];
const reviewKey = "GET /api/v1/platform/access-requests";

function open(
  tab: AccessTab,
  permissions: readonly string[] = approverPermissions,
  review: (viewerPublicId: string) => unknown[] = () => [accessRequestBody()],
) {
  const net = operationNetwork.install();
  const session = platformSessionFixture({ permissions: [...permissions] });
  usePlatformSession.getState().setSession(session);
  net.on("GET /api/v1/platform/me", () => ({ status: 200, body: session.user }));
  net.on(reviewKey, () => ({
    status: 200,
    body: { items: review(session.user.publicId) },
  }));
  net.on("GET /api/v1/platform/access-requests/mine", () => ({
    status: 200,
    body: { items: [] },
  }));
  net.on("GET /api/v1/platform/access-sessions/live", () => ({
    status: 200,
    body: { items: [accessSessionBody()] },
  }));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <PlatformAccessRequestsPage search={{ tab }} />
    </QueryClientProvider>,
  );
  return { net };
}

afterEach(cleanup);

describe("Access requests", () => {
  it("approves another operator's request, narrowed to Read only", async () => {
    const { net } = open("review");
    const key = "POST /api/v1/platform/access-requests/{requestPublicId}/approve";
    net.on(key, () => ({
      status: 200,
      body: accessRequestBody({ state: "APPROVED", grantedScope: "READ", grantedMinutes: 120 }),
    }));
    const [approve] = await screen.findAllByRole("button", { name: "Approve" });
    if (!approve) throw new Error("Missing approve control");
    fireEvent.click(approve);
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("combobox", { name: "Access" }));
    fireEvent.click(await screen.findByRole("option", { name: "Read only" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Approve" }));
    await waitFor(() => expect(net.count(key)).toBe(1));
    expect(net.calls.find((call) => call.key === key)?.input).toEqual({
      params: { requestPublicId: accessRequestIds.request },
      body: { scope: "READ", minutes: 120 },
    });
  });

  it("never offers a decision on the approver's own request", async () => {
    open("review", approverPermissions, (own) => [
      accessRequestBody({ requester: { publicId: own, name: "Me" } }),
    ]);
    expect(await screen.findByText(/Another approver decides/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Approve" })).toBeNull();
  });

  it("ends a live session only with a reason", async () => {
    const { net } = open("live");
    const key = "POST /api/v1/platform/access-sessions/{sessionPublicId}/end";
    net.on(key, () => ({ status: 200, body: accessSessionBody({ status: "ENDED" }) }));
    const [end] = await screen.findAllByRole("button", { name: "End session" });
    if (!end) throw new Error("Missing end control");
    fireEvent.click(end);
    const dialog = await screen.findByRole("dialog");
    const confirm = within(dialog).getByRole("button", { name: "End session" });
    expect(confirm).toBeDisabled();
    fireEvent.change(within(dialog).getByRole("textbox", { name: "Reason for ending" }), {
      target: { value: "The customer withdrew the request." },
    });
    fireEvent.click(confirm);
    await waitFor(() => expect(net.count(key)).toBe(1));
    expect(net.calls.find((call) => call.key === key)?.input).toEqual({
      params: { sessionPublicId: accessSessionIds.session },
      body: { note: "The customer withdrew the request." },
    });
  });

  it("shows an operator only their own requests", async () => {
    open("review", ["delegation:open"]);
    expect(await screen.findByText("You have not requested access yet.")).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /To review/ })).toBeNull();
    expect(screen.queryByRole("tab", { name: "History" })).toBeNull();
  });
});
