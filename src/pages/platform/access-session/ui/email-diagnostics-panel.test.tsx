import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { usePlatformSession } from "@/shared/auth";
import { platformSessionFixture } from "../../../../test/audience-fixtures";
import {
  diagnosticCatalogueBody,
  diagnosticPreviewBody,
  diagnosticReceiptBody,
  diagnosticsPermissions,
} from "../../../../test/email-diagnostics-fixtures";
import { problemBody } from "../../../../test/operation-fakes";
import { operationNetwork } from "../../../../test/operation-request-mock";
import {
  accessSessionBody,
  accessSessionIds as ids,
} from "../../../../test/platform-access-session-fixtures";
import "../../../../test/router-mock";
import { AccessSessionPage } from "./access-session-page";

// Install the network seam before loading the public API's live transport.
const { delegatedCompanyOperations: operations } = await import("@/shared/api");

function open(permissions: readonly string[] = diagnosticsPermissions) {
  const net = operationNetwork.install();
  const platform = platformSessionFixture({ permissions: [...permissions] });
  usePlatformSession.getState().setSession(platform);
  net.on("GET /api/v1/platform/me", () => ({ status: 200, body: platform.user }));
  net.on("GET /api/v1/platform/access-sessions/{sessionPublicId}", () => ({
    status: 200,
    body: accessSessionBody(),
  }));
  net.on(operations.diagnosticTypes.key, () => ({ status: 200, body: diagnosticCatalogueBody() }));
  net.on(operations.diagnosticPreview.key, () => ({ status: 200, body: diagnosticPreviewBody() }));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = render(
    <QueryClientProvider client={client}>
      <AccessSessionPage sessionPublicId={ids.session} search={{ area: "email" }} />
    </QueryClientProvider>,
  );
  return { net, client, platform, view };
}

async function confirm() {
  fireEvent.click(await screen.findByRole("button", { name: "Send synthetic test" }));
  const dialog = screen.getByRole("dialog");
  expect(dialog).toHaveTextContent("Employee invitation");
  fireEvent.click(within(dialog).getByRole("button", { name: "Confirm test send" }));
}

function inputBody(input: unknown) {
  return operations.diagnosticSend.requestSchema.parse(input).body;
}

afterEach(() => {
  cleanup();
  usePlatformSession.getState().clearSession();
});

describe("bounded Company email diagnostics", () => {
  it("discards in-flight acceptance after send authority is lost and restored", async () => {
    const { net, platform } = open();
    let settle: ((value: { status: number; body: unknown }) => void) | undefined;
    let requestId = "";
    net.on(operations.diagnosticSend.key, (input) => {
      requestId = inputBody(input).requestId;
      return new Promise((resolve) => {
        settle = resolve;
      });
    });
    await confirm();
    expect(await screen.findByText("Requesting acceptance…")).toBeInTheDocument();
    await act(() =>
      usePlatformSession.getState().revalidate(async () => ({
        ...platform.user,
        permissions: platform.user.permissions.filter(
          (permission) => permission !== "delegation:email-diagnostics:test-send",
        ),
      })),
    );
    await act(() => usePlatformSession.getState().revalidate(async () => platform.user));
    await act(async () => {
      settle?.({ status: 202, body: diagnosticReceiptBody(requestId) });
    });
    expect(screen.queryByText("Accepted · queued")).toBeNull();
    expect(screen.queryByRole("button", { name: "Check delivery result" })).toBeNull();
    expect(net.count(operations.diagnosticSend.key)).toBe(1);
  });
  it("clears the retained receipt when the exact send grant is lost without replacing sign-in", async () => {
    const { net, platform } = open();
    net.on(operations.diagnosticSend.key, (input) => ({
      status: 202,
      body: diagnosticReceiptBody(inputBody(input).requestId),
    }));
    await confirm();
    expect(await screen.findByText("Accepted · queued")).toBeInTheDocument();
    await act(() =>
      usePlatformSession.getState().revalidate(async () => ({
        ...platform.user,
        permissions: platform.user.permissions.filter(
          (permission) => permission !== "delegation:email-diagnostics:test-send",
        ),
      })),
    );
    expect(screen.queryByText("Accepted · queued")).toBeNull();
    await act(() => usePlatformSession.getState().revalidate(async () => platform.user));
    expect(screen.queryByText("Accepted · queued")).toBeNull();
    expect(screen.queryByRole("button", { name: "Check delivery result" })).toBeNull();
    expect(net.count(operations.diagnosticSend.key)).toBe(1);
  });
  it("keeps an empty catalogue non-actionable with one safe reload", async () => {
    const { net } = open(["delegation:open", "delegation:email-diagnostics:preview"]);
    net.on(operations.diagnosticTypes.key, () => ({ status: 200, body: { items: [] } }));
    expect(
      await screen.findByText("No supported sample emails are available."),
    ).toBeInTheDocument();
    expect(screen.queryByTitle("Isolated Company email preview")).toBeNull();
    expect(screen.queryByRole("button", { name: "Send synthetic test" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(net.count(operations.diagnosticTypes.key)).toBe(2));
  });
  it("binds selected sample and language to distinct preview keys and the confirmed command", async () => {
    const { net, client } = open();
    net.on(operations.diagnosticPreview.key, (input) => {
      const request = operations.diagnosticPreview.requestSchema.parse(input);
      return {
        status: 200,
        body: { ...diagnosticPreviewBody(request.query.locale), emailTypeKey: request.params.key },
      };
    });
    net.on(operations.diagnosticSend.key, (input) => {
      const command = inputBody(input);
      return {
        status: 202,
        body: diagnosticReceiptBody(command.requestId, {
          emailTypeKey: command.emailTypeKey,
          locale: command.locale,
        }),
      };
    });
    fireEvent.click(await screen.findByRole("combobox", { name: "Sample email" }));
    fireEvent.click(screen.getByRole("option", { name: "Company user recovery" }));
    fireEvent.click(screen.getByRole("combobox", { name: "Email language" }));
    fireEvent.click(screen.getByRole("option", { name: "Arabic" }));
    expect(await screen.findByText("دعوة تجريبية")).toBeInTheDocument();
    expect(
      client
        .getQueryCache()
        .getAll()
        .some(
          (query) =>
            query.queryKey.at(-2) === "company-user-recovery" && query.queryKey.at(-1) === "ar",
        ),
    ).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Send synthetic test" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("Company user recovery sample in Arabic");
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Confirm test send" }),
    );
    expect(await screen.findByText("Accepted · queued")).toBeInTheDocument();
    expect(net.calls.find((call) => call.key === operations.diagnosticSend.key)?.input).toEqual({
      params: { sessionPublicId: ids.session },
      body: { requestId: expect.any(String), emailTypeKey: "company-user-recovery", locale: "ar" },
    });
  });
  it("keeps replay blocked when authoritative receipt retrieval is unavailable", async () => {
    const { net } = open();
    net.on(operations.diagnosticSend.key, () => ({ status: 500, body: problemBody(500) }));
    net.on(operations.diagnosticResult.key, () => ({ status: 500, body: problemBody(500) }));
    await confirm();
    expect(await screen.findByText(/Acceptance could not be confirmed/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Check delivery result" }));
    await waitFor(() => expect(net.count(operations.diagnosticResult.key)).toBe(1));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Check delivery result" })).toBeEnabled(),
    );
    expect(screen.queryByRole("button", { name: "Confirm the same request again" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Send synthetic test" })).toBeNull();
    expect(net.count(operations.diagnosticSend.key)).toBe(1);
  });
  it("uses only fixed delegated context, inert preview, explicit confirmation and worker evidence", async () => {
    const { net, client, platform } = open();
    net.on(operations.diagnosticSend.key, (input) => ({
      status: 202,
      body: diagnosticReceiptBody(inputBody(input).requestId),
    }));
    net.on(operations.diagnosticResult.key, (input) => ({
      status: 200,
      body: diagnosticReceiptBody(
        operations.diagnosticResult.requestSchema.parse(input).params.requestId,
        { status: "SENT" },
      ),
    }));
    expect(await screen.findByText("Sample invitation")).toBeInTheDocument();
    const frame = screen.getByTitle("Isolated Company email preview");
    expect(frame).toHaveAttribute("sandbox", "");
    expect(frame.getAttribute("srcdoc")).not.toMatch(/<script|<iframe|<form|href=|src="https:/);
    expect(net.count(operations.diagnosticSend.key)).toBe(0);
    await confirm();
    expect(await screen.findByText("Accepted · queued")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Check delivery result" }));
    expect(await screen.findByText("Sent by the delivery worker")).toBeInTheDocument();
    expect(
      net.calls
        .filter((call) => call.key.includes("email-diagnostics"))
        .every((call) => call.audience === "delegated"),
    ).toBe(true);
    expect(
      client
        .getQueryCache()
        .getAll()
        .filter((query) => query.queryKey[0] === "platform-delegated")
        .every(
          (query) =>
            query.queryKey[1] === platform.user.publicId && query.queryKey[2] === ids.session,
        ),
    ).toBe(true);
    expect(document.body.textContent).not.toMatch(
      /raw-description-canary|internal-detail-canary|company-invitation-v2|77777777/,
    );
  });

  it("holds the same intent through 500, result 404, explicit replay and duplicate clicks", async () => {
    const { net } = open();
    let accepts = false;
    net.on(operations.diagnosticSend.key, (input) =>
      accepts
        ? { status: 202, body: diagnosticReceiptBody(inputBody(input).requestId) }
        : { status: 500, body: problemBody(500) },
    );
    net.on(operations.diagnosticResult.key, () => ({ status: 404, body: problemBody(404) }));
    await confirm();
    expect(await screen.findByText(/Acceptance could not be confirmed/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Confirm the same request again" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Send synthetic test" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Check delivery result" }));
    expect(await screen.findByText(/No accepted receipt is visible yet/)).toBeInTheDocument();
    const original = net.calls.find((call) => call.key === operations.diagnosticSend.key)?.input;
    accepts = true;
    fireEvent.click(screen.getByRole("button", { name: "Confirm the same request again" }));
    const submit = within(screen.getByRole("dialog")).getByRole("button", {
      name: "Confirm test send",
    });
    fireEvent.click(submit);
    fireEvent.click(submit);
    expect(await screen.findByText("Accepted · queued")).toBeInTheDocument();
    expect(
      net.calls
        .filter((call) => call.key === operations.diagnosticSend.key)
        .map((call) => call.input),
    ).toEqual([original, original]);
  });

  it.each([
    "EMAIL_DIAGNOSTIC_NOT_READY",
    "DIAGNOSTIC_REQUEST_CONFLICT",
  ])("reconciles %s with safe distinct copy and no automatic send", async (code) => {
    const { net } = open();
    net.on(operations.diagnosticSend.key, () => ({
      status: 409,
      body: problemBody(409, { code }),
    }));
    await confirm();
    expect(
      await screen.findByText(
        code === "EMAIL_DIAGNOSTIC_NOT_READY" ? /Company sender is not ready/ : /no longer matches/,
      ),
    ).toBeInTheDocument();
    expect(net.count(operations.diagnosticSend.key)).toBe(1);
    expect(screen.queryByRole("button", { name: "Send synthetic test" })).toBeNull();
    expect(document.body.textContent).not.toContain("internal-detail-canary");
  });

  it("honors the diagnostic limiter without dropping input or automatically retrying", async () => {
    const { net } = open();
    net.on(operations.diagnosticSend.key, () => ({
      status: 429,
      body: problemBody(429, { code: "DIAGNOSTIC_RATE_LIMITED", retryAfterSeconds: 20 }),
    }));
    await confirm();
    expect(await screen.findByText(/Wait 20 seconds/)).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Sample email" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Confirm the same request again" })).toBeNull();
    expect(net.count(operations.diagnosticSend.key)).toBe(1);
  });

  it("supports independent preview-only and send-only grants", async () => {
    const first = open(["delegation:open", "delegation:email-diagnostics:preview"]);
    expect(await screen.findByText("Sample invitation")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Send synthetic test" })).toBeNull();
    expect(first.net.count(operations.diagnosticSend.key)).toBe(0);
    cleanup();
    const second = open(["delegation:open", "delegation:email-diagnostics:test-send"]);
    expect(await screen.findByRole("button", { name: "Send synthetic test" })).toBeEnabled();
    expect(second.net.count(operations.diagnosticTypes.key)).toBe(0);
    expect(second.net.count(operations.diagnosticPreview.key)).toBe(0);
  });

  it.each([
    "ACCESS_SESSION_INACTIVE",
    "PERMISSION_DENIED",
  ])("clears Company content immediately on %s even if session metadata remains OPEN", async (code) => {
    const { net, client } = open();
    expect(await screen.findByText("Sample invitation")).toBeInTheDocument();
    net.on(operations.diagnosticSend.key, () => ({
      status: 403,
      body: problemBody(403, { code }),
    }));
    await confirm();
    await waitFor(() => expect(screen.queryByTitle("Isolated Company email preview")).toBeNull());
    expect(screen.queryByRole("button", { name: "Send synthetic test" })).toBeNull();
    await waitFor(() =>
      expect(
        client
          .getQueryCache()
          .getAll()
          .filter(
            (query) => query.queryKey[0] === "platform-delegated" && query.state.data !== undefined,
          ),
      ).toHaveLength(0),
    );
  });

  it("blocks new sends after a malformed accepted response and exposes no extra field", async () => {
    const { net } = open();
    net.on(operations.diagnosticSend.key, (input) => ({
      status: 202,
      body: diagnosticReceiptBody(inputBody(input).requestId, { recipient: "recipient-canary" }),
    }));
    await confirm();
    expect(
      await screen.findByText(/diagnostics contract could not be validated/),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Send synthetic test" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Confirm the same request again" })).toBeNull();
    expect(document.body.textContent).not.toContain("recipient-canary");
    net.on(operations.diagnosticResult.key, (input) => ({
      status: 200,
      body: diagnosticReceiptBody(
        operations.diagnosticResult.requestSchema.parse(input).params.requestId,
        { status: "SENT" },
      ),
    }));
    fireEvent.click(screen.getByRole("button", { name: "Check delivery result" }));
    expect(await screen.findByText("Sent by the delivery worker")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Send synthetic test" })).toBeNull();
    expect(net.count(operations.diagnosticSend.key)).toBe(1);
  });

  it("discards acceptance that settles after Platform sign-in replacement", async () => {
    const { net } = open();
    let settle: ((value: { status: number; body: unknown }) => void) | undefined;
    let requestId = "";
    net.on(operations.diagnosticSend.key, (input) => {
      requestId = inputBody(input).requestId;
      return new Promise((resolve) => {
        settle = resolve;
      });
    });
    await confirm();
    expect(await screen.findByText("Requesting acceptance…")).toBeInTheDocument();
    usePlatformSession
      .getState()
      .setSession(platformSessionFixture({ permissions: [...diagnosticsPermissions] }));
    settle?.({ status: 202, body: diagnosticReceiptBody(requestId) });
    await waitFor(() => expect(screen.queryByText("Requesting acceptance…")).toBeNull());
    expect(screen.queryByText("Accepted · queued")).toBeNull();
  });
});
