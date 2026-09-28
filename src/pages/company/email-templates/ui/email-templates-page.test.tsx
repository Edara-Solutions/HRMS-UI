import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useCompanySession } from "@/shared/auth";
import { companySessionFixture } from "../../../../test/audience-fixtures";
import {
  effectiveBody,
  emailTypesBody,
  previewBody,
  variantsBody,
} from "../../../../test/company-communications-fixtures";
import { accessPolicyBody } from "../../../../test/company-organization-fixtures";
import { problemBody } from "../../../../test/operation-fakes";
import { operationNetwork } from "../../../../test/operation-request-mock";
import "../../../../test/router-mock";
import { CompanyEmailTemplatesPage } from "./email-templates-page";

const editor = [
  "email-types:read",
  "email-template-variants:read",
  "email-templates:preview",
  "email-template-assignments:read",
  "email-template-assignments:create",
  "email-template-assignments:delete",
  "emails:test-send",
  "company-access-policies:read",
];

async function openVariants() {
  const select = await screen.findByRole("combobox", { name: "Use another template" });
  await waitFor(() => expect(select).toBeEnabled());
  fireEvent.click(select);
}

function renderTemplates({ permissions = editor, assignments = [] as unknown[] } = {}) {
  const net = operationNetwork.install();
  net.on("GET /api/v1/company/email-types", () => ({ status: 200, body: emailTypesBody() }));
  net.on("GET /api/v1/company/email-types/{key}", () => ({
    status: 200,
    body: emailTypesBody().items[0],
  }));
  net.on("GET /api/v1/company/email-template-assignments", () => ({
    status: 200,
    body: { items: assignments },
  }));
  net.on("GET /api/v1/company/email-types/{key}/variants", () => ({
    status: 200,
    body: variantsBody(),
  }));
  net.on("GET /api/v1/company/email-template-assignments/{emailTypeKey}/effective", () => ({
    status: 200,
    body: effectiveBody(),
  }));
  net.on("GET /api/v1/company/email-types/{key}/preview", (input) => ({
    status: 200,
    body: previewBody((input as { query: { locale?: "en" | "ar" } }).query.locale ?? "en"),
  }));
  net.on("GET /api/v1/company/access-policy", () => ({
    status: 200,
    body: accessPolicyBody("NORMAL"),
  }));
  useCompanySession.getState().setSession(companySessionFixture({ permissions }));
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <CompanyEmailTemplatesPage />
    </QueryClientProvider>,
  );
  return net;
}

afterEach(() => {
  cleanup();
  useCompanySession.getState().clearSession();
});

describe("Company email templates", () => {
  it("lists only Company-context email types and never Edara invitation or recovery mail", async () => {
    const net = renderTemplates();
    expect(await screen.findAllByText("Payslip ready")).not.toHaveLength(0);
    expect(screen.queryByText("Invitation secret email")).toBeNull();
    await waitFor(() => expect(net.count("GET /api/v1/company/email-types/{key}/preview")).toBe(1));
    expect(JSON.stringify(net.calls)).not.toContain("edara.company-invitation");
  });

  it("offers only eligible variants: Company context at the type's payload version", async () => {
    renderTemplates();
    await openVariants();
    const options = (await screen.findAllByRole("option")).map((option) => option.textContent);
    expect(options).toEqual(["payslip-ready.warm"]);
  });

  it("assigns after confirmation and reconciles the effective template after a conflict", async () => {
    const net = renderTemplates();
    net.on("POST /api/v1/company/email-template-assignments", () => ({
      status: 409,
      body: problemBody(409),
    }));
    await openVariants();
    fireEvent.click(await screen.findByRole("option", { name: "payslip-ready.warm" }));
    fireEvent.click(screen.getByRole("button", { name: "Use this template" }));
    fireEvent.click(
      within(await screen.findByRole("dialog")).getByRole("button", { name: "Use this template" }),
    );
    expect(
      await screen.findByText(
        "This changed since you opened it. It has been refreshed; review it before trying again.",
      ),
    ).toBeInTheDocument();
    expect(
      net.calls.find((call) => call.key.startsWith("POST /api/v1/company/email-template"))?.input,
    ).toEqual({
      body: { emailTypeKey: "company.payslip-ready", templateRevisionKey: "payslip-ready.warm" },
    });
    await waitFor(() =>
      expect(
        net.count("GET /api/v1/company/email-template-assignments/{emailTypeKey}/effective"),
      ).toBe(2),
    );
  });

  it("falls back to the default template by deleting the Company assignment", async () => {
    const net = renderTemplates({
      assignments: [
        { emailTypeKey: "company.payslip-ready", templateRevisionKey: "payslip-ready.warm" },
      ],
    });
    net.on("DELETE /api/v1/company/email-template-assignments/{emailTypeKey}", () => ({
      status: 204,
    }));
    fireEvent.click(await screen.findByRole("button", { name: "Use the default template" }));
    fireEvent.click(
      within(await screen.findByRole("dialog")).getByRole("button", {
        name: "Use the default template",
      }),
    );
    expect(await screen.findByText("The default template is used again.")).toBeInTheDocument();
    expect(net.calls.find((call) => call.key.startsWith("DELETE"))?.input).toEqual({
      params: { emailTypeKey: "company.payslip-ready" },
    });
  });

  it("renders the preview in an inert sandbox that cannot run, navigate or fetch", async () => {
    renderTemplates();
    const frame = await screen.findByTitle("Email preview: Your payslip is ready");
    expect(frame).toHaveAttribute("sandbox", "");
    expect(frame).toHaveAttribute("referrerpolicy", "no-referrer");
    const document = frame.getAttribute("srcdoc") ?? "";
    expect(document).toContain("Hello Sample");
    expect(document).toContain("default-src 'none'");
    for (const canary of ["previewScriptCanary", "link-canary", "pixel-canary"])
      expect(document).not.toContain(canary);
  });

  it("switches the preview locale among the type's supported locales", async () => {
    const net = renderTemplates();
    fireEvent.click(await screen.findByRole("button", { name: "Arabic" }));
    expect(await screen.findByText("قسيمة الراتب جاهزة")).toBeInTheDocument();
    expect(
      net.calls.filter((call) => call.key.endsWith("/preview")).map((call) => call.input),
    ).toContainEqual({ params: { key: "company.payslip-ready" }, query: { locale: "ar" } });
  });

  it("queues a synthetic test send once and reports its declared status", async () => {
    const net = renderTemplates();
    net.on("POST /api/v1/company/emails/test-send", () => ({
      status: 202,
      body: {
        publicId: "6e5d4c3b-2a1f-4e0d-9c8b-7a6f5e4d3c2b",
        status: "QUEUED",
        emailTypeKey: "company.payslip-ready",
        context: "COMPANY",
        locale: "en",
        isTest: true,
      },
    }));
    const recipient = await screen.findByLabelText("Send to");
    fireEvent.change(recipient, { target: { value: "qa@edara.test" } });
    fireEvent.click(screen.getByRole("button", { name: "Send test" }));
    expect(await screen.findByText("Test email accepted — queued.")).toBeInTheDocument();
    expect(
      net.calls.filter((call) => call.key.endsWith("test-send")).map((call) => call.input),
    ).toEqual([
      {
        body: {
          emailTypeKey: "company.payslip-ready",
          recipientEmail: "qa@edara.test",
          locale: "en",
        },
      },
    ]);
  });

  it("hides commands and reads the identity is not granted", async () => {
    const net = renderTemplates({ permissions: ["email-types:read"] });
    expect(await screen.findAllByText("Payslip ready")).not.toHaveLength(0);
    expect(screen.queryByRole("button", { name: "Use this template" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Send test" })).toBeNull();
    expect(screen.queryByTitle(/Email preview/)).toBeNull();
    expect(net.count("GET /api/v1/company/email-types/{key}/preview")).toBe(0);
  });
});
