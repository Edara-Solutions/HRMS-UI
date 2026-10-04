import { cleanup, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { usePlatformSession } from "@/shared/auth";
import { platformSessionFixture } from "../../../../test/audience-fixtures";
import { PlatformDashboardPage } from "./platform-dashboard-page";

vi.mock("@tanstack/react-router", async (original) => ({
  ...(await original<typeof import("@tanstack/react-router")>()),
  Link: ({ children, to, className }: { children: ReactNode; to: string; className?: string }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}));

afterEach(() => {
  cleanup();
  usePlatformSession.getState().clearSession();
});

it("keeps illustrative overview data separate from permission-gated live links", () => {
  usePlatformSession.getState().setSession(platformSessionFixture({ permissions: ["plans:read"] }));
  render(<PlatformDashboardPage />);

  const demo = screen.getByRole("region", { name: "Sample overview · May 2026" });
  expect(within(demo).getByText("Demo data")).toBeInTheDocument();
  expect(within(demo).getByText(/not current company or billing data/)).toBeInTheDocument();
  expect(within(demo).getByText("Sample revenue trend")).toBeInTheDocument();
  expect(within(demo).getByText("Swift Systems")).toBeInTheDocument();
  expect(within(demo).getByText("Target · 210K SAR")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Plans" })).toHaveAttribute("href", "/platform/plans");
  expect(screen.queryByRole("link", { name: "Leads" })).not.toBeInTheDocument();
});
