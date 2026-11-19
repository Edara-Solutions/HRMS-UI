import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OperationRefusal } from "@/shared/api";
import { RouteAccessRefusal } from "@/shared/auth";
import { RequestFailurePage } from "./request-failure-page";

vi.mock("@tanstack/react-router", () => ({ useLocation: () => "/company/me/profile" }));
describe("safe request failure boundary", () => {
  it("never displays unexpected error messages or diagnostics", () => {
    render(
      <RequestFailurePage
        error={new Error("secret-id raw-stack /internal-route")}
        reset={vi.fn()}
      />,
    );
    expect(screen.getByRole("heading")).toHaveTextContent("This page could not be loaded");
    expect(document.body.textContent).not.toMatch(/secret-id|raw-stack|internal-route/);
  });
  it("maps only validated Company denial metadata to the specific bounded surface", () => {
    const refusal = new OperationRefusal(
      {
        audience: "company",
        key: "GET /api/v1/company/me/profile",
        parseResponse: () => undefined,
      },
      403,
      {
        code: "COMPANY_ACCESS_DENIED",
        mode: "BLOCKED",
        detail: "secret-id",
        traceId: "private-trace",
      },
    );
    render(
      <QueryClientProvider client={new QueryClient()}>
        <RequestFailurePage error={refusal} reset={vi.fn()} />
      </QueryClientProvider>,
    );
    expect(screen.getByRole("heading")).toHaveTextContent("Your company workspace is unavailable");
    expect(document.body.textContent).not.toMatch(/secret-id|private-trace/);
  });
  it("renders a guarded route refusal as the audience forbidden surface", () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <RequestFailurePage error={new RouteAccessRefusal("company")} reset={vi.fn()} />
      </QueryClientProvider>,
    );
    expect(screen.getByRole("heading")).toHaveTextContent("This area is not available to you");
  });
});
