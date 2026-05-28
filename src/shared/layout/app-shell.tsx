import { Header } from "@/shared/layout/header";
import { adminNavGroups, companyNavGroups } from "@/shared/layout/nav-items";
import { Sidebar } from "@/shared/layout/sidebar";
import { cn } from "@/shared/lib/cn";
import { ChevronLeft } from "lucide-react";
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
      />

      {/* Floating toggle — rides the sidebar/content boundary */}
      <button
        type="button"
        onClick={handleToggle}
        className={cn(
          "sidebar-toggle group absolute top-9 z-20",
          "flex size-6 -translate-y-1/2 ltr:-translate-x-1/2 rtl:translate-x-1/2 items-center justify-center rounded-full",
          collapsed ? "start-[60px]" : "start-[252px]",
          "border border-[var(--color-border)] bg-[var(--color-surface)]",
          "shadow-[var(--shadow-sm),0_0_0_2.5px_var(--color-bg)]",
          "hover:border-[color-mix(in_srgb,var(--color-primary)_55%,var(--color-border))]",
          "hover:bg-[var(--color-primary-soft)]",
          "hover:shadow-[var(--shadow-sm),0_0_0_2.5px_var(--color-bg),0_0_0_4.5px_color-mix(in_srgb,var(--color-primary)_14%,transparent)]",
          "active:scale-95",
        )}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <ChevronLeft
          size={11}
          strokeWidth={2.5}
          className={cn(
            "shrink-0 text-[var(--color-text-faint)]",
            "[transition:transform_var(--motion-base)_var(--motion-easing),color_var(--motion-fast)_var(--motion-easing)]",
            "group-hover:text-[var(--color-primary)]",
            "ltr:rotate-0 rtl:rotate-180",
            collapsed && "ltr:rotate-180 rtl:rotate-0",
          )}
        />
      </button>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header />
        <main className="scrollbar-calm scrollbar-stable flex-1 overflow-x-clip overflow-y-auto [overflow-anchor:none]">
          <div className="p-7">{children}</div>
        </main>
      </div>
    </div>
  );
}
