import { Shield } from "lucide-react";
import { type ReactNode, useCallback, useState, useSyncExternalStore } from "react";
import { Header } from "./header";
import { adminNavGroups, companyNavGroups } from "../model/nav-items";
import { Sidebar } from "./sidebar";

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

const compactViewportQuery = "(max-width: 767px)";

function subscribeToCompactViewport(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};

  const mediaQuery = window.matchMedia(compactViewportQuery);
  mediaQuery.addEventListener("change", onStoreChange);
  return () => mediaQuery.removeEventListener("change", onStoreChange);
}

function getCompactViewportSnapshot() {
  if (typeof window === "undefined") return false;
  return window.matchMedia(compactViewportQuery).matches;
}

export function AppShell({ portal, children }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const compactViewport = useSyncExternalStore(
    subscribeToCompactViewport,
    getCompactViewportSnapshot,
    () => false,
  );
  const config = portalConfig[portal];
  const sidebarCollapsed = collapsed || compactViewport;

  const handleToggle = useCallback(() => setCollapsed((prev) => !prev), []);

  return (
    <div className="relative flex h-dvh overflow-hidden bg-[var(--color-bg)]">
      <Sidebar
        groups={config.groups}
        portalLabel={config.label}
        portalSubtitle={config.subtitle}
        portalIcon={config.icon}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={handleToggle}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header />
        <main className="scrollbar-calm scrollbar-stable flex-1 overflow-x-clip overflow-y-auto [overflow-anchor:none]">
          <div className="p-4 sm:p-5 lg:p-7">{children}</div>
        </main>
      </div>
    </div>
  );
}
