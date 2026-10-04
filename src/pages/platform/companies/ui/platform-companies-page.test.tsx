import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { usePlatformSession } from "@/shared/auth";
import { platformSessionFixture } from "../../../../test/audience-fixtures";
import { operationNetwork } from "../../../../test/operation-request-mock";
import {
  companyBody,
  companyListBody,
  companyPermissions,
} from "../../../../test/platform-company-fixtures";
import { navigations } from "../../../../test/router-mock";
import { PlatformCompaniesPage } from "./platform-companies-page";

function open(permissions = companyPermissions, q?: string) {
  const net = operationNetwork.install();
  usePlatformSession.getState().setSession(platformSessionFixture({ permissions }));
  net.on("GET /api/v1/platform/companies", () => ({ status: 200, body: companyListBody() }));
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <PlatformCompaniesPage search={{ page: 1, q }} />
    </QueryClientProvider>,
  );
  return net;
}
afterEach(() => {
  cleanup();
  usePlatformSession.getState().clearSession();
  navigations.length = 0;
});
describe("Platform Company registry", () => {
  it("uses the exact Platform page contract and separates metadata from lifecycle", async () => {
    const net = open();
    expect((await screen.findAllByRole("link", { name: "Acme Company" }))[0]).toHaveAttribute(
      "href",
      expect.stringContaining("/platform/companies/"),
    );
    expect(net.calls[0]).toMatchObject({
      audience: "platform",
      key: "GET /api/v1/platform/companies",
      input: { query: { page: 1, limit: 20 } },
    });
    expect(screen.getByText("Registry isActive (read-only)")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Created at" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Activate" })).toBeNull();
  });
  it("creates only safe registry fields and navigates to its public ID", async () => {
    const net = open();
    net.on("POST /api/v1/platform/companies", () => ({ status: 201, body: companyBody() }));
    await screen.findAllByText("Acme Company");
    fireEvent.click(screen.getByRole("button", { name: "Create Company" }));
    const dialog = await screen.findByRole("dialog");
    for (const [label, value] of [
      ["Company name", "New Company"],
      ["Phone number", "01012345678"],
      ["Country", "Egypt"],
    ])
      fireEvent.change(within(dialog).getByLabelText(label), { target: { value } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Create Company" }));
    await waitFor(() => expect(net.count("POST /api/v1/platform/companies")).toBe(1));
    expect(net.calls.find((call) => call.key.startsWith("POST"))?.input).toEqual({
      body: {
        name: "New Company",
        logo: null,
        website: null,
        phoneNumber: "01012345678",
        country: "Egypt",
        addressLine: null,
      },
    });
    await waitFor(() => expect(navigations.length).toBe(1));
  });
  it("shows page-filter empty state without pretending the entire registry is empty", async () => {
    open(companyPermissions, "absent");
    expect(await screen.findByText("No matches on this page.")).toBeInTheDocument();
  });
  it("hides create without its exact permission", async () => {
    open(["companies:read"]);
    await screen.findAllByText("Acme Company");
    expect(screen.queryByRole("button", { name: "Create Company" })).toBeNull();
  });
  it("renders no request with only a Company identity", () => {
    const net = operationNetwork.install();
    render(
      <QueryClientProvider client={new QueryClient()}>
        <PlatformCompaniesPage search={{ page: 1 }} />
      </QueryClientProvider>,
    );
    expect(net.calls).toHaveLength(0);
  });
});
