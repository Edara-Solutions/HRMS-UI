import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { platformLeadOperations as operations } from "@/shared/api";
import { usePlatformSession } from "@/shared/auth";
import { platformSessionFixture } from "../../../../test/audience-fixtures";
import { problemBody } from "../../../../test/operation-fakes";
import { operationNetwork } from "../../../../test/operation-request-mock";
import {
  activityBody,
  contactBody,
  conversionBody,
  domainBody,
  eligibilityBody,
  leadBody,
  leadDetailBody,
  leadIds,
  leadPermissions,
  pageMeta,
  plansBody,
} from "../../../../test/platform-lead-fixtures";
import { navigations } from "../../../../test/router-mock";
import { PlatformLeadDetailPage } from "./crm-lead-detail-page";

vi.mock("@/shared/ui/location-select-data", () => ({
  loadCountries: async () => [
    { id: 65, name: "Egypt" },
    { id: 233, name: "United States" },
  ],
  loadStates: async (countryId: number) =>
    countryId === 65
      ? [{ id: 3235, name: "Cairo Governorate" }]
      : [{ id: 1456, name: "California" }],
}));

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
function open(permissions = leadPermissions, detail = leadDetailBody(), activityPage = 1) {
  const net = operationNetwork.install();
  usePlatformSession.getState().setSession(platformSessionFixture({ permissions }));
  net.on(operations.lead.key, () => ({ status: 200, body: detail }));
  net.on(operations.eligibility.key, () => ({ status: 200, body: eligibilityBody() }));
  net.on(operations.activities.key, () => ({
    status: 200,
    body: { items: [activityBody()], meta: pageMeta() },
  }));
  net.on(operations.domain.key, () => ({ status: 200, body: domainBody() }));
  net.on(operations.readiness.key, () => ({
    status: 200,
    body: { ready: false, reason: "NOT_VERIFIED" },
  }));
  net.on(operations.plans.key, () => ({ status: 200, body: plansBody() }));
  render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
        })
      }
    >
      <PlatformLeadDetailPage publicId={leadIds.lead} activityPage={activityPage} />
    </QueryClientProvider>,
  );
  return net;
}
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  usePlatformSession.getState().clearSession();
  navigations.length = 0;
});
describe("Platform lead workspace", () => {
  it("shows scoped DNS records and contact activity without provider disclosure", async () => {
    open();
    expect(await screen.findByText("Intended Owner", { exact: false })).toBeVisible();
    fireEvent.click(screen.getByRole("tab", { name: "Domain" }));
    expect(await screen.findByText("verify-acme")).toBeVisible();
    fireEvent.click(screen.getByRole("tab", { name: "Activity" }));
    expect(await screen.findByText("Requested a demo")).toBeVisible();
    expect(document.body.textContent).not.toMatch(/canary/);
    const ids = Array.from(document.querySelectorAll("[id]"), (node) => node.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("read-only actors inspect the lead without write or conversion controls", async () => {
    const net = open(["leads:read"]);
    fireEvent.click(await screen.findByRole("tab", { name: "Activity" }));
    expect(await screen.findByText("Requested a demo")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Log activity" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Delete activity/ })).toBeNull();
    expect(screen.queryByRole("button", { name: "Edit lead" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Convert immediately" })).toBeNull();
    expect(screen.queryByText("Sending domain")).toBeNull();
    expect(
      net.calls.every((call) => call.key.startsWith("GET") && !call.key.includes("sending-domain")),
    ).toBe(true);
  });
  it("summarizes automated events, shows manual notes, and pages through activity", async () => {
    const net = open();
    net.on(operations.activities.key, () => ({
      status: 200,
      body: {
        items: [
          activityBody(),
          activityBody({
            publicId: leadIds.other,
            type: "SYSTEM_EVENT",
            note: "Status changed: QUALIFIED -> LOST (Reason: NO_BUDGET)",
          }),
          activityBody({
            publicId: leadIds.contact,
            type: "SYSTEM_EVENT",
            note: "Lead conversion request rejected: internal-system-canary",
          }),
          activityBody({
            publicId: leadIds.plan,
            type: "FORM_SUBMISSION",
            note: "Lead created from source=LANDING_PAGE",
          }),
        ],
        meta: { ...pageMeta(1, 2), pageSize: 20, totalItems: 22 },
      },
    }));
    fireEvent.click(await screen.findByRole("tab", { name: "Activity" }));
    expect(await screen.findByText("Requested a demo")).toBeVisible();
    expect(screen.getByText("Qualified → Lost · No budget")).toBeVisible();
    expect(screen.getByText("Conversion request rejected")).toBeVisible();
    expect(screen.getByText("Lead created")).toBeVisible();
    expect(document.body.textContent).not.toContain("internal-system-canary");
    expect(screen.getByText("1–4 of 22 activities")).toBeVisible();
    const pagination = within(screen.getByRole("navigation", { name: "Activity pages" }));
    fireEvent.click(pagination.getByRole("button", { name: "Next" }));
    expect(navigations.at(-1)).toMatchObject({ search: { activityPage: 2 } });
  });
  it("validates and confirms a manual activity, then clears the draft and returns to the latest page", async () => {
    const net = open(leadPermissions, leadDetailBody(), 2);
    net.on(operations.addActivity.key, () => ({
      status: 201,
      body: activityBody({ note: "Called the owner" }),
    }));
    await screen.findByText("Requested a demo");
    const form = within(screen.getByRole("tabpanel", { name: "Activity" }));
    const type = form.getByRole("combobox", { name: "Activity type" });
    expect(within(type).queryByRole("option", { name: "System event" })).toBeNull();
    const note = form.getByRole("textbox", { name: "Activity note" });
    fireEvent.change(note, { target: { value: "  " } });
    fireEvent.click(form.getByRole("button", { name: "Log activity" }));
    expect(await screen.findByText("Enter a note before logging this activity.")).toBeVisible();
    fireEvent.change(note, { target: { value: "  Called the owner  " } });
    fireEvent.click(form.getByRole("button", { name: "Log activity" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Record this activity for Acme Lead.")).toBeVisible();
    fireEvent.click(within(dialog).getByRole("button", { name: "Log activity" }));
    await waitFor(() => expect(navigations.at(-1)).toMatchObject({ search: { activityPage: 1 } }));
    expect(net.calls.find((call) => call.key === operations.addActivity.key)?.input).toEqual({
      params: { publicId: leadIds.lead },
      body: { type: "NOTE", note: "Called the owner" },
    });
    expect(form.getByRole("textbox", { name: "Activity note" })).toHaveValue("");
  });
  it.each([
    false,
    true,
  ])("shows the correct edit options with status override %s", async (override) => {
    vi.stubEnv("ALLOW_LEAD_STATUS_OVERRIDE", String(override));
    open(leadPermissions, leadDetailBody({ lead: leadBody({ status: "QUALIFIED" }) }));
    fireEvent.click(await screen.findByRole("button", { name: "Edit lead" }));
    await waitFor(() =>
      expect(screen.getByRole("combobox", { name: "State / Region" })).toBeEnabled(),
    );
    const options = within(screen.getByRole("combobox", { name: "Status" }));
    expect(options.getByRole("option", { name: "Negotiation" })).toBeInTheDocument();
    expect(!!options.queryByRole("option", { name: "Contacted" })).toBe(override);
  });
  it("prefills the edit contact modal, saves changed fields, and refreshes eligibility", async () => {
    const net = open();
    net.on(operations.updateContact.key, () => ({ status: 200, body: contactBody() }));
    fireEvent.click(await screen.findByRole("button", { name: "Edit contact" }));
    const dialog = await screen.findByRole("dialog", { name: "Edit contact" });
    const name = within(dialog).getByLabelText("Contact name");
    expect(name).toHaveValue("Intended Owner");
    fireEvent.change(name, {
      target: { value: "Updated owner" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save contact" }));
    await waitFor(() => expect(net.count(operations.updateContact.key)).toBe(1));
    expect(net.calls.find((call) => call.key === operations.updateContact.key)?.input).toEqual({
      params: { publicId: leadIds.lead, contactPublicId: leadIds.contact },
      body: { name: "Updated owner" },
    });
    await waitFor(() => expect(net.count(operations.eligibility.key)).toBeGreaterThan(1));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
  it.each([
    false,
    true,
  ])("updates the saved lead location correctly when country changes: %s", async (changeCountry) => {
    const net = open();
    net.on(operations.update.key, () => ({
      status: 200,
      body: { lead: leadBody(), contacts: [contactBody()] },
    }));
    fireEvent.click(await screen.findByRole("button", { name: "Edit lead" }));
    const dialog = within(await screen.findByRole("dialog", { name: "Edit lead" }));
    const country = dialog.getByRole("combobox", { name: "Country" });
    expect(country).toHaveTextContent("Egypt");
    expect(dialog.getByRole("combobox", { name: "State / Region" })).toHaveTextContent("Cairo");
    if (changeCountry) {
      await waitFor(() => expect(country).toBeEnabled());
      fireEvent.click(country);
      fireEvent.click(await screen.findByRole("option", { name: "United States" }));
      const state = dialog.getByRole("combobox", { name: "State / Region" });
      expect(state).not.toHaveTextContent("Cairo");
      await waitFor(() => expect(state).toBeEnabled());
      fireEvent.click(state);
      expect(await screen.findByRole("option", { name: "California" })).toBeVisible();
      expect(screen.queryByRole("option", { name: "Cairo Governorate" })).toBeNull();
    } else {
      fireEvent.change(dialog.getByLabelText("Company name"), {
        target: { value: "Renamed Lead" },
      });
    }
    fireEvent.click(dialog.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(net.count(operations.update.key)).toBe(1));
    expect(net.calls.find(({ key }) => key === operations.update.key)?.input).toEqual({
      params: { publicId: leadIds.lead },
      body: changeCountry
        ? { country: "United States", city: null }
        : { companyName: "Renamed Lead" },
    });
  });
  it("validates an add contact draft and saves from the same modal", async () => {
    const net = open();
    net.on(operations.addContact.key, () => ({
      status: 201,
      body: contactBody({ publicId: leadIds.other, name: "New contact", isPrimary: false }),
    }));
    fireEvent.click(await screen.findByRole("button", { name: "Add contact" }));
    const dialog = within(await screen.findByRole("dialog", { name: "Add contact" }));
    const email = dialog.getByLabelText("Contact email");
    fireEvent.change(dialog.getByLabelText("Contact name"), { target: { value: "New contact" } });
    fireEvent.change(email, { target: { value: "invalid" } });
    fireEvent.click(dialog.getByRole("button", { name: "Add contact" }));
    expect(email).toHaveAttribute("aria-invalid", "true");
    expect(net.count(operations.addContact.key)).toBe(0);
    fireEvent.change(email, { target: { value: "new@example.test" } });
    fireEvent.click(dialog.getByRole("button", { name: "Add contact" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(net.calls.find(({ key }) => key === operations.addContact.key)?.input).toEqual({
      params: { publicId: leadIds.lead },
      body: { name: "New contact", email: "new@example.test", isPrimary: false },
    });
  });
  it("lists the primary contact first and promotes a secondary contact through confirmation", async () => {
    const secondary = contactBody({
      publicId: leadIds.other,
      name: "Secondary contact",
      isPrimary: false,
    });
    const net = open(leadPermissions, leadDetailBody({ contacts: [secondary, contactBody()] }));
    net.on(operations.updateContact.key, () => ({
      status: 200,
      body: { ...secondary, isPrimary: true },
    }));
    await screen.findByText("Intended Owner");
    const [primary, other] = screen.getAllByRole("article");
    expect(within(primary).getByText("Intended Owner")).toBeVisible();
    expect(within(primary).queryByRole("button", { name: "Delete contact" })).toBeNull();
    fireEvent.click(within(other).getByRole("button", { name: "Make primary" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Save contact" }));
    await waitFor(() => expect(net.count(operations.updateContact.key)).toBe(1));
    expect(net.calls.find(({ key }) => key === operations.updateContact.key)?.input).toEqual({
      params: { publicId: leadIds.lead, contactPublicId: leadIds.other },
      body: { isPrimary: true },
    });
  });
  it("keeps the contact draft open after a failed save and lets the user reconcile", async () => {
    const net = open();
    net.on(operations.updateContact.key, () => ({ status: 400, body: problemBody(400) }));
    fireEvent.click(await screen.findByRole("button", { name: "Edit contact" }));
    const dialog = within(await screen.findByRole("dialog", { name: "Edit contact" }));
    const name = dialog.getByLabelText("Contact name");
    fireEvent.change(name, { target: { value: "Keep this draft" } });
    fireEvent.click(dialog.getByRole("button", { name: "Save contact" }));
    expect(await dialog.findByRole("alert")).not.toBeEmptyDOMElement();
    expect(name).toHaveValue("Keep this draft");
    fireEvent.click(dialog.getByRole("button", { name: "Reconcile current records" }));
    await waitFor(() => expect(dialog.getByRole("button", { name: "Save contact" })).toBeEnabled());
    expect(name).toHaveValue("Keep this draft");
    expect(net.count(operations.updateContact.key)).toBe(1);
  });
  it("shows the current conversion blocker and keeps both conversion forms out of view", async () => {
    const net = open();
    net.on(operations.eligibility.key, () => ({
      status: 200,
      body: eligibilityBody({
        isEligible: false,
        primaryContact: null,
        reasons: [{ code: "PRIMARY_CONTACT_MISSING", message: "internal-eligibility-canary" }],
      }),
    }));
    fireEvent.click(await screen.findByRole("tab", { name: "Conversion" }));
    expect(await screen.findByText("Conversion prerequisites are incomplete.")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Request conversion" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Convert immediately" })).toBeNull();
    expect(document.body.textContent).not.toContain("internal-eligibility-canary");
    fireEvent.click(screen.getByRole("button", { name: "Go to lead contacts" }));
    expect(screen.getByRole("tab", { name: "Profile" })).toHaveFocus();
  });
  it("shows one conversion form at a time and preserves the setup draft when switching", async () => {
    open();
    fireEvent.click(await screen.findByRole("tab", { name: "Conversion" }));
    const review = await screen.findByRole("radio", { name: "Submit for review" });
    const immediate = screen.getByRole("radio", { name: "Convert without review" });
    expect(review).toBeChecked();
    expect(screen.queryByRole("button", { name: "Convert immediately" })).toBeNull();
    fireEvent.click(immediate);
    const custom = await screen.findByRole("checkbox", { name: "Custom setup steps" });
    fireEvent.click(custom);
    fireEvent.click(review);
    expect(screen.queryByRole("checkbox", { name: "Custom setup steps" })).toBeNull();
    expect(screen.getByRole("button", { name: "Request conversion" })).toBeVisible();
    fireEvent.click(immediate);
    expect(screen.getByRole("checkbox", { name: "Custom setup steps" })).toBeChecked();
  });
  it("reconciles a failed immediate conversion to a page-two request and never resubmits", async () => {
    const net = open();
    net.on(operations.immediate.key, () => ({ status: 500, body: problemBody(500) }));
    net.on(operations.requests.key, (input) => {
      const query = operations.requests.parseRequest(input).query;
      return {
        status: 200,
        body: { items: query.page === 2 ? [conversionBody()] : [], meta: pageMeta(query.page, 2) },
      };
    });
    fireEvent.click(await screen.findByRole("tab", { name: "Conversion" }));
    fireEvent.click(await screen.findByRole("radio", { name: "Convert without review" }));
    const convert = await screen.findByRole("button", { name: "Convert immediately" });
    await waitFor(() => expect(convert).toBeEnabled());
    fireEvent.click(convert);
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Convert immediately" }));
    expect(await screen.findByRole("link", { name: "Inspect original request" })).toHaveAttribute(
      "href",
      `/platform/conversion-requests/${leadIds.request}`,
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.queryByRole("button", { name: "Convert immediately" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Request conversion" })).toBeNull();
    fireEvent.click(screen.getByRole("tab", { name: "Profile" }));
    fireEvent.click(screen.getByRole("tab", { name: "Conversion" }));
    expect(screen.queryByRole("button", { name: "Convert immediately" })).toBeNull();
    expect(net.count(operations.immediate.key)).toBe(1);
    expect(document.body.textContent).not.toMatch(/canary/);
  });
  it("shows no missing-domain provisioning assumption after a refused read", async () => {
    const net = open();
    net.on(operations.domain.key, () => ({ status: 403, body: problemBody(403) }));
    fireEvent.click(await screen.findByRole("tab", { name: "Domain" }));
    expect(
      await screen.findByText("This section is unavailable with your current access."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Provision domain" })).toBeNull();
    expect(screen.queryByText("No sending domain is provisioned.")).toBeNull();
  });
});
