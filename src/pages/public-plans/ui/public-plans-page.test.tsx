import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { i18next } from "@/shared/i18n";
import { PublicPlansPage } from "./public-plans-page";

const queryState = vi.hoisted(() => ({
  result: { data: [] } as { data: unknown[] } | Error,
}));

vi.mock("../api/public-plans", () => ({
  publicPlansQuery: () => ({
    queryKey: ["public-plans-page-test"],
    queryFn: async () => {
      if (queryState.result instanceof Error) throw queryState.result;
      return queryState.result;
    },
    retry: false,
  }),
}));

const plan = {
  publicId: "9d40a776-1fb7-4d44-ae8f-7b125850789f",
  name: "خطة الفريق",
  description: "وصف كتبه فريق المنتج",
  duration: 30,
  features: ["ATTENDANCE", "FUTURE_FEATURE"],
  effectivePrice: null,
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  void i18next.changeLanguage("en");
});

describe("PublicPlansPage", () => {
  it("shows authored direction-safe content and never presents a null price as free", async () => {
    queryState.result = { data: [plan] };
    render(<PublicPlansPage />);

    expect(screen.getByText("Loading plans…")).toBeInTheDocument();
    expect(await screen.findByText(plan.name)).toHaveAttribute("dir", "auto");
    expect(screen.getByText(plan.description)).toHaveAttribute("dir", "auto");
    expect(screen.getByText("Attendance")).toBeInTheDocument();
    expect(screen.getByText("FUTURE_FEATURE")).toBeInTheDocument();
    expect(screen.getByText("No price published for this context")).toBeInTheDocument();
    expect(screen.queryByText(/free/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("renders a retryable bounded error without exposing a backend payload", async () => {
    const secret = "private-payload@example.com";
    queryState.result = new Error(secret);
    render(<PublicPlansPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Plans could not be loaded right now.",
    );
    expect(screen.queryByText(secret)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeEnabled();
  });

  it("renders the published-catalogue empty state", async () => {
    queryState.result = { data: [] };
    render(<PublicPlansPage />);

    await waitFor(() => {
      expect(screen.getByText("No plans have been published yet.")).toBeInTheDocument();
    });
  });
});
