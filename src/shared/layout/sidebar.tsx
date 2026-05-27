import { useAuthStore } from "@/auth/store";
import { usePreferencesStore } from "@/preferences/store";
import type { NavGroup } from "@/shared/layout/nav-items";
import { cn } from "@/shared/lib/cn";
import { Avatar } from "@/shared/ui/avatar";
import { Link, useMatchRoute } from "@tanstack/react-router";
import { ChevronLeft, Moon, Settings, Sun } from "lucide-react";
import type { ReactNode } from "react";

interface SidebarProps {
  groups: NavGroup[];
  portalLabel: string;
  portalSubtitle: string;
  portalIcon: ReactNode;
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({
  groups,
  portalLabel,
  portalSubtitle,
  portalIcon,
  collapsed,
  onToggle,
}: SidebarProps) {
  return (
    <aside
      className={cn(
        "flex h-dvh flex-col border-e border-[var(--color-border)] bg-[var(--color-surface)] transition-[width] duration-[var(--motion-base)] ease-[var(--motion-easing)]",
        collapsed ? "w-[60px]" : "w-[252px]",
      )}
    >
      {/* Brand */}
      <div className="flex items-center gap-2.5 border-b border-[var(--color-border)] px-4 py-5">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-text)] text-[13px] font-bold leading-none text-[var(--color-surface)]">
          {portalIcon}
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold tracking-tight text-[var(--color-text)]">
              {portalLabel}
            </p>
            <span className="text-[11px] text-[var(--color-text-faint)]">{portalSubtitle}</span>
          </div>
        )}
        <button
          type="button"
          onClick={onToggle}
          className="ms-auto inline-flex size-6 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-text-faint)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-muted)]"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronLeft
            size={12}
            className={cn(
              "transition-transform duration-[var(--motion-fast)]",
              collapsed && "rotate-180",
            )}
          />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2.5 py-3">
        {groups.map((group) => (
          <div key={group.title} className="mb-5">
            {!collapsed && (
              <p className="mb-1.5 px-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-widest text-[var(--color-text-faint)]">
                {group.title}
              </p>
            )}
            <ul className="flex flex-col gap-px">
              {group.items.map((item) => (
                <SidebarLink key={item.href} item={item} collapsed={collapsed} />
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <SidebarFooter collapsed={collapsed} />
    </aside>
  );
}

interface SidebarLinkProps {
  item: { label: string; href: string; icon: ReactNode; badge?: string };
  collapsed: boolean;
}

function SidebarLink({ item, collapsed }: SidebarLinkProps) {
  const matchRoute = useMatchRoute();
  const isActive = matchRoute({ to: item.href, fuzzy: true });

  return (
    <li>
      <Link
        to={item.href}
        className={cn(
          "flex items-center gap-[9px] rounded-[var(--radius-md)] px-2.5 py-2 text-[13.5px] font-medium transition-colors duration-[var(--motion-fast)]",
          isActive
            ? "bg-[var(--color-primary-soft)] text-[var(--color-primary)]"
            : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]",
          collapsed && "justify-center px-0",
        )}
        aria-current={isActive ? "page" : undefined}
        title={collapsed ? item.label : undefined}
      >
        <span className={cn("shrink-0 opacity-70", isActive && "opacity-100")}>{item.icon}</span>
        {!collapsed && (
          <>
            <span className="truncate">{item.label}</span>
            {item.badge && (
              <span
                className={cn(
                  "ms-auto inline-flex h-5 min-w-5 items-center justify-center rounded-[var(--radius-sm)] px-1.5 text-[10px] font-semibold tabular-nums",
                  isActive
                    ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                    : "bg-[var(--color-surface-2)] text-[var(--color-text-muted)]",
                )}
              >
                {item.badge}
              </span>
            )}
          </>
        )}
      </Link>
    </li>
  );
}

function SidebarFooter({ collapsed }: { collapsed: boolean }) {
  const user = useAuthStore((state) => state.session?.user);
  const theme = usePreferencesStore((state) => state.theme);
  const toggleTheme = usePreferencesStore((state) => state.toggleTheme);

  return (
    <div className="border-t border-[var(--color-border)] px-2.5 py-3">
      {/* Settings link */}
      <Link
        to="/company/dashboard"
        className={cn(
          "mb-1.5 flex items-center gap-[9px] rounded-[var(--radius-md)] px-2.5 py-2 text-[13.5px] font-medium text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]",
          collapsed && "justify-center px-0",
        )}
      >
        <Settings size={16} className="opacity-70" />
        {!collapsed && <span>Settings</span>}
      </Link>

      {/* User card with theme toggle */}
      <button
        type="button"
        onClick={toggleTheme}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-[var(--radius-lg)] px-2.5 py-2 transition-colors hover:bg-[var(--color-surface-2)]",
          collapsed && "justify-center px-0",
        )}
        aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
      >
        <Avatar
          size="sm"
          initials={user ? `${user.firstName[0]}${user.lastName[0]}` : "?"}
          alt={user ? `${user.firstName} ${user.lastName}` : "User"}
        />
        {!collapsed && (
          <div className="min-w-0 flex-1 text-start">
            <p className="truncate text-[13px] font-semibold text-[var(--color-text)]">
              {user ? `${user.firstName} ${user.lastName}` : "User"}
            </p>
            <p className="truncate text-[11px] text-[var(--color-text-faint)]">
              {user?.status === "ACTIVE" ? "Employee" : (user?.status ?? "")}
            </p>
          </div>
        )}
        {!collapsed && (
          <span className="shrink-0 text-[var(--color-text-faint)]">
            {theme === "light" ? <Moon size={14} /> : <Sun size={14} />}
          </span>
        )}
      </button>
    </div>
  );
}
