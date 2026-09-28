import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useCompanySession } from "@/shared/auth";
import { companySessionFixture } from "../../../../test/audience-fixtures";
import { accessPolicyBody } from "../../../../test/company-organization-fixtures";
import {
  peopleCanaries,
  peopleIds,
  personBody,
  rosterBody,
} from "../../../../test/company-people-fixtures";
import { problemBody } from "../../../../test/operation-fakes";
import { operationNetwork } from "../../../../test/operation-request-mock";
import { navigations } from "../../../../test/router-mock";
import type { RosterSearch } from "../model/roster";
import { CompanyPeoplePage } from "./people-page";

const listKey = "GET /api/v1/company/users";
const bulkUpdateKey = "PATCH /api/v1/company/users/bulk";
const bulkDeleteKey = "DELETE /api/v1/company/users/bulk";
const manager = [
  "users:read",
  "users:create",
  "users:update",
  "users:delete",
  "company-access-policies:read",
];

function renderRoster({
  permissions = manager,
  mode = "NORMAL",
  search = {},
  roster = rosterBody([peopleIds.actor, peopleIds.colleague, peopleIds.owner]),
}: {
  permissions?: string[];
  mode?: string;
  search?: RosterSearch;
  roster?: unknown;
} = {}) {
  const net = operationNetwork.install();
  net.on(listKey, () => ({ status: 200, body: roster }));
  net.on("GET /api/v1/company/access-policy", () => ({
    status: 200,
    body: accessPolicyBody(mode),
  }));
  navigations.length = 0;
  useCompanySession
    .getState()
    .setSession(companySessionFixture({ publicId: peopleIds.actor, permissions }));
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <CompanyPeoplePage search={search} />
    </QueryClientProvider>,
  );
  return net;
}

afterEach(() => {
  cleanup();
  useCompanySession.getState().clearSession();
});

describe("Company roster", () => {
  it("reads one bounded, Company-bound page from the URL search", async () => {
    const net = renderRoster({ search: { q: "omar", status: "ACTIVE", page: 2 } });
    expect(await screen.findByRole("link", { name: "Omar Nabil" })).toHaveAttribute(
      "href",
      `/company/people/${peopleIds.colleague}`,
    );
    expect(net.calls.find((call) => call.key === listKey)?.input).toEqual({
      query: { search: "omar", status: "ACTIVE", page: 2, pageSize: 20, sort: "nameAsc" },
    });
    expect(JSON.stringify(net.calls)).not.toContain(companySessionFixture().user.companyPublicId);
  });

  it("never lets the actor select themselves for a bulk command", async () => {
    renderRoster();
    expect(await screen.findByRole("checkbox", { name: "Select Sara Ahmed" })).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: "Select Omar Nabil" })).toBeEnabled();
  });

  it("reports a partial bulk status change by person without backend text", async () => {
    const net = renderRoster();
    net.on(bulkUpdateKey, () => ({
      status: 200,
      body: {
        success: [personBody(peopleIds.colleague, { status: "SUSPENDED" })],
        errors: [{ index: 1, publicId: peopleIds.owner, error: "bulk-error-canary" }],
      },
    }));
    fireEvent.click(await screen.findByRole("checkbox", { name: "Select Omar Nabil" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Select Laila Hassan" }));
    fireEvent.click(screen.getByRole("combobox", { name: "New status" }));
    fireEvent.click(await screen.findByRole("option", { name: "Suspended" }));
    fireEvent.click(screen.getByRole("button", { name: "Change status" }));
    fireEvent.click(
      within(await screen.findByRole("dialog")).getByRole("button", { name: "Change status" }),
    );
    const summary = await screen.findByRole("alert");
    expect(summary).toHaveTextContent("1 person updated");
    expect(summary).toHaveTextContent("Laila Hassan");
    expect(net.calls.find((call) => call.key === bulkUpdateKey)?.input).toEqual({
      body: [
        { publicId: peopleIds.colleague, status: "SUSPENDED" },
        { publicId: peopleIds.owner, status: "SUSPENDED" },
      ],
    });
    for (const canary of peopleCanaries) expect(document.body.textContent).not.toContain(canary);
  });

  it("requires the typed count before a bulk delete and never retries it", async () => {
    const net = renderRoster();
    net.on(bulkDeleteKey, () => {
      throw new TypeError("Failed to fetch");
    });
    fireEvent.click(await screen.findByRole("checkbox", { name: "Select Omar Nabil" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete selected" }));
    const dialog = await screen.findByRole("dialog");
    const confirm = within(dialog).getByRole("button", { name: "Delete selected" });
    expect(confirm).toBeDisabled();
    fireEvent.change(within(dialog).getByLabelText("Type 1 to confirm"), {
      target: { value: "1" },
    });
    fireEvent.click(confirm);
    expect(
      await screen.findByText(
        "We could not confirm the change. The page was refreshed; check the result before trying again.",
      ),
    ).toBeInTheDocument();
    expect(net.count(bulkDeleteKey)).toBe(1);
    await waitFor(() => expect(net.count(listKey)).toBeGreaterThanOrEqual(2));
  });

  it.each([
    "READ_ONLY",
    "FROZEN",
    "MAINTENANCE",
  ])("keeps the roster readable but commands disabled in %s", async (mode) => {
    renderRoster({ mode });
    await waitFor(() => expect(screen.getByRole("button", { name: "Add person" })).toBeDisabled());
    fireEvent.click(await screen.findByRole("checkbox", { name: "Select Omar Nabil" }));
    expect(screen.getByRole("button", { name: "Delete selected" })).toBeDisabled();
  });

  it("hides commands and selection the identity is not granted", async () => {
    renderRoster({ permissions: ["users:read"] });
    await screen.findByRole("link", { name: "Omar Nabil" });
    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(screen.queryByRole("button", { name: "Add person" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Add several" })).toBeNull();
  });

  it("distinguishes an empty roster from no filtered matches", async () => {
    renderRoster({ roster: rosterBody([]), search: { q: "zzz" } });
    expect(await screen.findByText("No one matches these filters.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(navigations).toEqual([{ to: "/company/people", search: {} }]);
  });

  it("escalates a malformed page read to the contract-unavailable state", async () => {
    renderRoster({ roster: { items: [{ publicId: "x" }], meta: {} } });
    expect(
      await screen.findByText(
        "This information is temporarily unavailable. Actions that depend on it are paused.",
      ),
    ).toBeInTheDocument();
  });

  it("maps a declared bulk refusal to safe copy and refreshes authority", async () => {
    const net = renderRoster();
    net.on(bulkDeleteKey, () => ({ status: 403, body: problemBody(403) }));
    net.on("GET /api/v1/company/me", () => ({
      status: 200,
      body: companySessionFixture({ publicId: peopleIds.actor, permissions: ["users:read"] }).user,
    }));
    fireEvent.click(await screen.findByRole("checkbox", { name: "Select Omar Nabil" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete selected" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Type 1 to confirm"), {
      target: { value: "1" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete selected" }));
    expect(
      await screen.findByText(
        "You can no longer make this change. Your access and this record were refreshed.",
      ),
    ).toBeInTheDocument();
    await waitFor(() => expect(net.count("GET /api/v1/company/me")).toBe(1));
    await waitFor(() => expect(screen.queryByRole("checkbox")).toBeNull());
  });
});
