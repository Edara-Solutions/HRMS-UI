import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AuthSession, PermissionAction, SessionUser } from "@/shared/auth";
import { useAuthStore } from "@/shared/auth";
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

function signIn(overrides: Partial<SessionUser> & { permissions: PermissionAction[] }) {
  useAuthStore.setState({
    status: "authenticated",
    session: {
      accessToken: "access",
      refreshToken: "refresh",
      sessionId: "session",
      expiresIn: 900,
      user: {
        publicId: "11111111-1111-4111-8111-111111111111",
        employeeCode: "E-1",
        firstName: "Dana",
        lastName: "Reed",
        email: "dana@example.com",
        status: "ACTIVE",
        companyCode: "NW",
        companyPublicId: null,
        mustChangePassword: false,
        isOwner: false,
        isPlatformAdmin: false,
        ...overrides,
      },
    } satisfies AuthSession,
  });
}

function renderSidebar(groups: NavGroup[]) {
  render(
    <Sidebar
      groups={groups}
      portalLabel="Edara"
      portalSubtitle="Portal"
      portalIcon={<span>E</span>}
      collapsed={false}
      onToggleCollapsed={vi.fn()}
    />,
  );
}

afterEach(() => {
  cleanup();
  useAuthStore.setState({ session: null, status: "anonymous" });
});

describe.each([
  { portal: "Company", groups: companyNavGroups, label: "Audit log" },
  { portal: "Admin", groups: adminNavGroups, label: "Audit Log" },
])("$portal audit nav entry", ({ groups, label }) => {
  it("is hidden for an identity without audit-events:read", () => {
    signIn({ permissions: ["users:read"] });
    renderSidebar(groups);

    expect(screen.queryByRole("link", { name: label })).not.toBeInTheDocument();
  });

  it("is shown for an identity granted audit-events:read", () => {
    signIn({ permissions: ["audit-events:read"] });
    renderSidebar(groups);

    expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
  });

  // Both portals bypass the permission list for these identities, exactly as the backend
  // guard does, so neither may be hidden by the new nav field.
  it.each([
    { identity: "an owner", grants: { isOwner: true } },
    { identity: "a platform admin", grants: { isPlatformAdmin: true } },
  ])("is shown for $identity holding no explicit grant", ({ grants }) => {
    signIn({ permissions: [], ...grants });
    renderSidebar(groups);

    expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
  });
});
