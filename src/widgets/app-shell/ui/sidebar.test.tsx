import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AudienceSessionProvider, useCompanySession } from "@/shared/auth";
import { companySessionFixture } from "../../../test/audience-fixtures";
import { buildNavGroups } from "../model/nav-items";
import { SessionFooter, Sidebar } from "./sidebar";

vi.mock("@tanstack/react-router", () => ({
  useLocation: () => ({ pathname: "/company/people" }),
  Link: ({ to, children, ...props }: { to: string; children: React.ReactNode }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useNavigate: () => vi.fn(),
}));
afterEach(() => {
  cleanup();
  useCompanySession.getState().clearSession();
});

function renderSidebar(collapsed: boolean) {
  useCompanySession.getState().setSession(companySessionFixture());
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AudienceSessionProvider audience="company">
        <Sidebar
          groups={buildNavGroups(
            { audience: "company", authenticated: true, permissions: ["users:read"] },
            "en",
            { showUpcoming: true, counts: { people: 42 } },
          )}
          portalLabel="Edara"
          portalSubtitle="People Operations"
          portalIcon={<span>E</span>}
          collapsed={collapsed}
          onToggleCollapsed={vi.fn()}
          footer={<SessionFooter collapsed={collapsed} />}
        />
      </AudienceSessionProvider>
    </QueryClientProvider>,
  );
}

describe("sidebar", () => {
  it.each([
    false,
    true,
  ])("renders Soon entries as disabled text, never links (collapsed=%s)", (collapsed) => {
    renderSidebar(collapsed);
    const hrefs = screen.getAllByRole("link").map((link) => link.getAttribute("href"));
    expect(hrefs).toEqual(["/company/dashboard", "/company/people"]);
    expect(screen.getByRole("link", { name: /People/ })).toHaveAttribute("aria-current", "page");
    expect(document.querySelectorAll('[aria-disabled="true"]')).toHaveLength(10);
  });

  it("shows the People count expanded and only a dot collapsed", () => {
    renderSidebar(false);
    expect(within(screen.getByRole("link", { name: /People/ })).getByText("42")).toBeVisible();
    cleanup();
    renderSidebar(true);
    expect(screen.queryByText("42")).not.toBeInTheDocument();
  });

  it("holds the me-pages and Sign out in the user menu", () => {
    renderSidebar(false);
    fireEvent.click(screen.getByRole("button", { name: "User menu" }));
    const menu = screen.getByRole("menu");
    expect(
      within(menu)
        .getAllByRole("menuitem")
        .map((item) => item.textContent),
    ).toEqual(["My profile", "Security", "My sessions", "Sign out"]);
    expect([...menu.querySelectorAll("a")].map((link) => link.getAttribute("href"))).toEqual([
      "/company/me/profile",
      "/company/me/security",
      "/company/me/sessions",
    ]);
  });
});
