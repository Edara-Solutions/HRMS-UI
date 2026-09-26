import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AudienceName, PermissionAction } from "@/shared/auth";
import { AudienceSessionProvider, useCompanySession, usePlatformSession } from "@/shared/auth";
import { companySessionFixture, platformSessionFixture } from "../../../test/audience-fixtures";
import type { NavGroup } from "../model/nav-items";
import { adminNavGroups, companyNavGroups } from "../model/nav-items";
import { Sidebar } from "./sidebar";

// The sidebar only needs a location and a navigate; a full router would add no coverage.
vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
    useLocation: () => ({ pathname: "/" }),
    useNavigate: () => vi.fn(),
  };
});

function signIn(audience: AudienceName, permissions: PermissionAction[], isOwner = false) {
  if (audience === "company") {
    useCompanySession.getState().setSession(companySessionFixture({ permissions, isOwner }));
  } else {
    usePlatformSession.getState().setSession(platformSessionFixture({ permissions }));
  }
}

function renderSidebar(groups: NavGroup[], audience: AudienceName) {
  render(
    <AudienceSessionProvider audience={audience}>
      <Sidebar
        groups={groups}
        portalLabel="Edara"
        portalSubtitle="Portal"
        portalIcon={<span>E</span>}
        collapsed={false}
        onToggleCollapsed={vi.fn()}
      />
    </AudienceSessionProvider>,
  );
}

afterEach(() => {
  cleanup();
  useCompanySession.getState().clearSession();
  usePlatformSession.getState().clearSession();
});

describe.each([
  { portal: "Company", audience: "company" as const, groups: companyNavGroups, label: "Audit log" },
  { portal: "Admin", audience: "platform" as const, groups: adminNavGroups, label: "Audit Log" },
])("$portal audit nav entry", ({ audience, groups, label }) => {
  it("is hidden for an identity without audit-events:read", () => {
    signIn(audience, ["users:read"]);
    renderSidebar(groups, audience);

    expect(screen.queryByRole("link", { name: label })).not.toBeInTheDocument();
  });

  it("is shown for an identity granted audit-events:read", () => {
    signIn(audience, ["audit-events:read"]);
    renderSidebar(groups, audience);

    expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
  });

  it("does not turn privileged identity metadata into a permission grant", () => {
    signIn(audience, [], true);
    renderSidebar(groups, audience);

    expect(screen.queryByRole("link", { name: label })).not.toBeInTheDocument();
  });
});
