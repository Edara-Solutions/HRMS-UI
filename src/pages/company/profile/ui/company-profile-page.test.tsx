import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useCompanySession } from "@/shared/auth";
import { companySessionFixture } from "../../../../test/audience-fixtures";
import {
  accessPolicyBody,
  organizationCanaries,
  profileBody,
} from "../../../../test/company-organization-fixtures";
import { problemBody } from "../../../../test/operation-fakes";
import { operationNetwork } from "../../../../test/operation-request-mock";
import { CompanyProfilePage } from "./company-profile-page";

vi.mock("@tanstack/react-router", async (original) => ({
  ...(await original<typeof import("@tanstack/react-router")>()),
  Link: ({ children, to, className }: { children: ReactNode; to: string; className?: string }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}));

const readKey = "GET /api/v1/company/profile";
const updateKey = "PATCH /api/v1/company/profile";
const editor = ["company-profiles:read", "company-profiles:update", "company-access-policies:read"];

function renderProfile({ permissions = editor, mode = "NORMAL" } = {}) {
  operationNetwork.install();
  const net = operationNetwork.current;
  net.on(readKey, () => ({ status: 200, body: profileBody() }));
  net.on("GET /api/v1/company/access-policy", () => ({
    status: 200,
    body: accessPolicyBody(mode),
  }));
  for (const key of [
    "GET /api/v1/company/setup",
    "GET /api/v1/company/activation",
    "GET /api/v1/company/registry",
  ])
    net.on(key, () => ({ status: 200, body: {} }));
  useCompanySession.getState().setSession(companySessionFixture({ permissions }));
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <CompanyProfilePage />
    </QueryClientProvider>,
  );
  return net;
}

afterEach(() => {
  cleanup();
  useCompanySession.getState().clearSession();
});

async function editPhone(value: string) {
  const phone = await screen.findByLabelText("Company phone");
  await waitFor(() => expect(phone).toBeEnabled());
  fireEvent.change(phone, { target: { value } });
  return phone;
}

describe("Company organization profile", () => {
  it("is distinct from the personal profile in route, copy and data", async () => {
    const net = renderProfile();
    expect(
      await screen.findByRole("heading", { level: 1, name: "Organization profile" }),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "My profile" })).toHaveAttribute(
      "href",
      "/company/me/profile",
    );
    expect(net.calls.map((call) => call.key)).not.toContain("GET /api/v1/company/me/profile");
  });

  it("sends only edited fields through the generated operation", async () => {
    const net = renderProfile();
    net.on(updateKey, () => ({ status: 200, body: profileBody({ phone: "+20 100 000 0000" }) }));
    await editPhone("+20 100 000 0000");
    fireEvent.change(screen.getByLabelText("Company email"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Save profile" }));
    expect(
      await screen.findByText(
        "Organization profile saved. Fill in the remaining required details to complete it.",
      ),
    ).toBeInTheDocument();
    expect(net.calls.find((call) => call.key === updateKey)).toEqual({
      audience: "company",
      key: updateKey,
      input: { body: { email: null, phone: "+20 100 000 0000" } },
    });
  });

  it("maps declared invalid fields without rendering backend text", async () => {
    const net = renderProfile();
    net.on(updateKey, () => ({
      status: 400,
      body: problemBody(400, { invalidParams: ["/phone"] }),
    }));
    await editPhone("12");
    fireEvent.click(screen.getByRole("button", { name: "Save profile" }));
    expect(await screen.findByText("This value was not accepted.")).toBeInTheDocument();
    expect(screen.getByLabelText("Company phone")).toHaveAttribute("aria-invalid", "true");
    for (const canary of organizationCanaries)
      expect(document.body.textContent).not.toContain(canary);
  });

  it("keeps the draft and reconciles an unconfirmed save without retrying it", async () => {
    const net = renderProfile();
    net.on(updateKey, () => {
      throw new TypeError("Failed to fetch");
    });
    await editPhone("+20 111");
    fireEvent.click(screen.getByRole("button", { name: "Save profile" }));
    expect(
      await screen.findByText(
        "We could not confirm the save. The profile was refreshed and your edits are kept; check it before saving again.",
      ),
    ).toBeInTheDocument();
    await waitFor(() => expect(net.count(readKey)).toBe(2));
    expect(screen.getByLabelText("Company phone")).toHaveValue("+20 111");
    expect(net.count(updateKey)).toBe(1);
  });

  it.each([
    "READ_ONLY",
    "FROZEN",
    "MAINTENANCE",
  ])("keeps the profile readable but not editable in %s mode", async (mode) => {
    renderProfile({ mode });
    const name = await screen.findByLabelText("Company name");
    await waitFor(() => expect(name).toBeDisabled());
    expect(screen.queryByRole("button", { name: "Save profile" })).toBeNull();
    expect(
      screen.getAllByText("Changes are paused for your company workspace.").length,
    ).toBeGreaterThan(0);
  });

  it("shows a read-only summary with no edit controls without the update permission", async () => {
    renderProfile({ permissions: ["company-profiles:read"] });
    expect(await screen.findByText("Edara Labs")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByRole("button", { name: "Save profile" })).toBeNull();
  });

  it("escalates a blocked workspace to the route boundary", async () => {
    operationNetwork.install();
    operationNetwork.current.on(readKey, () => ({
      status: 403,
      body: problemBody(403, { code: "COMPANY_ACCESS_DENIED", mode: "BLOCKED" }),
    }));
    operationNetwork.current.on("GET /api/v1/company/access-policy", () => ({
      status: 200,
      body: accessPolicyBody("BLOCKED"),
    }));
    useCompanySession.getState().setSession(companySessionFixture({ permissions: editor }));
    const caught = vi.fn();
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <Boundary onError={caught}>
          <CompanyProfilePage />
        </Boundary>
      </QueryClientProvider>,
    );
    await waitFor(() => expect(caught).toHaveBeenCalled());
    expect(caught.mock.calls[0]?.[0]).toMatchObject({ status: 403, mode: "BLOCKED" });
  });
});

import { Component } from "react";

class Boundary extends Component<
  { children: ReactNode; onError: (error: unknown) => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    this.props.onError(error);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
