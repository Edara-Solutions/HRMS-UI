import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AudienceSessionProvider, useCompanySession } from "@/shared/auth";
import { companySessionFixture } from "../../../test/audience-fixtures";
import { buildNavGroups } from "../model/nav-items";
import { Sidebar } from "./sidebar";

vi.mock("@tanstack/react-router", () => ({
  useLocation: () => ({ pathname: "/company/me/profile" }),
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
describe("sidebar from projected registry", () => {
  it.each([false, true])("keeps SELF reachable with collapsed=%s", (collapsed) => {
    useCompanySession.getState().setSession(companySessionFixture());
    render(
      <AudienceSessionProvider audience="company">
        <Sidebar
          groups={buildNavGroups(
            { audience: "company", authenticated: true, permissions: [] },
            "en",
          )}
          portalLabel="Edara"
          portalSubtitle="People Operations"
          portalIcon={<span>E</span>}
          collapsed={collapsed}
          onToggleCollapsed={vi.fn()}
          footer={<span>Identity</span>}
        />
      </AudienceSessionProvider>,
    );
    const links = screen.getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toContain("/company/me/profile");
    expect(
      links.find((link) => link.getAttribute("href") === "/company/me/profile"),
    ).toHaveAttribute("aria-current", "page");
    expect(screen.queryByText("Payroll")).not.toBeInTheDocument();
  });
});
