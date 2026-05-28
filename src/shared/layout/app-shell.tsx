import { Header } from "@/shared/layout/header";
import { adminNavGroups, companyNavGroups } from "@/shared/layout/nav-items";
import { Sidebar } from "@/shared/layout/sidebar";
import { Shield } from "lucide-react";
import { type ReactNode, useCallback, useState } from "react";

// Hoist static icon JSX to avoid recreating on each render
const COMPANY_ICON = <span className="text-[13px] font-bold">E</span>;
const ADMIN_ICON = <Shield size={14} />;

interface AppShellProps {
  portal: "company" | "admin";
  children: ReactNode;
}

const portalConfig = {
  company: {
    label: "Edara",
    subtitle: "People Operations",
    icon: COMPANY_ICON,
    groups: companyNavGroups,
  },
  admin: {
    label: "Edara Admin",
    subtitle: "Platform Management",
    icon: ADMIN_ICON,
    groups: adminNavGroups,
  },
} as const;

export function AppShell({ portal, children }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const config = portalConfig[portal];

  const handleToggle = useCallback(() => setCollapsed((prev) => !prev), []);

  return (
    <div className="relative flex h-dvh overflow-hidden bg-[var(--color-bg)]">
      <Sidebar
        groups={config.groups}
        portalLabel={config.label}
        portalSubtitle={config.subtitle}
        portalIcon={config.icon}
        collapsed={collapsed}
        onToggleCollapsed={handleToggle}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header />
        <main className="scrollbar-calm scrollbar-stable flex-1 overflow-x-clip overflow-y-auto [overflow-anchor:none]">
          <div className="p-7">{children}</div>
        </main>
      </div>
    </div>
  );
}
