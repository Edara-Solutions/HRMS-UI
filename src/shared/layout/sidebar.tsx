import { useAuthStore } from "@/auth/store";
import type { NavGroup } from "@/shared/layout/nav-items";
import { cn } from "@/shared/lib/cn";
import { Avatar } from "@/shared/ui/avatar";
import { Link, useMatchRoute, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, LogOut, Settings, User } from "lucide-react";
import { type ReactNode, useCallback, useRef, useState } from "react";

interface SidebarProps {
  groups: NavGroup[];
  portalLabel: string;
  portalIcon: ReactNode;
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ groups, portalLabel, portalIcon, collapsed, onToggle }: SidebarProps) {
  return (
    <aside
      className={cn(
        "flex h-dvh flex-col border-e border-[var(--color-border)] bg-[var(--color-surface)] transition-[width] duration-[var(--motion-base)] ease-[var(--motion-easing)]",
        collapsed ? "w-[60px]" : "w-[240px]",
      )}
    >
      <div className="flex h-12 items-center gap-2.5 border-b border-[var(--color-border)] px-3">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-primary)] text-white">
          {portalIcon}
        </div>
        {!collapsed && (
          <span className="truncate text-[13px] font-semibold text-[var(--color-text)]">
            {portalLabel}
          </span>
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

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {groups.map((group) => (
          <div key={group.title} className="mb-3">
            {!collapsed && (
              <p className="mb-0.5 px-2 py-1 text-[11px] font-medium uppercase tracking-wider text-[var(--color-text-faint)]">
                {group.title}
              </p>
            )}
            <ul className="space-y-px">
              {group.items.map((item) => (
                <SidebarLink key={item.href} item={item} collapsed={collapsed} />
              ))}
            </ul>
          </div>
        ))}
      </nav>

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
          "flex items-center gap-2.5 rounded-[var(--radius-md)] px-2 py-1.5 text-[13px] font-medium transition-colors duration-[var(--motion-fast)]",
          isActive
            ? "bg-[var(--color-primary-soft)] text-[var(--color-primary)]"
            : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]",
          collapsed && "justify-center px-0",
        )}
        aria-current={isActive ? "page" : undefined}
        title={collapsed ? item.label : undefined}
      >
        <span className="shrink-0 opacity-75">{item.icon}</span>
        {!collapsed && (
          <>
            <span className="truncate">{item.label}</span>
            {item.badge && (
              <span className="ms-auto inline-flex h-5 min-w-5 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-surface-2)] px-1.5 text-[10px] font-semibold tabular-nums text-[var(--color-text-muted)]">
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
  const navigate = useNavigate();
  const clearSession = useAuthStore((state) => state.clearSession);
  const user = useAuthStore((state) => state.session?.user);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleLogout = useCallback(() => {
    clearSession();
    void navigate({ to: "/login" });
  }, [clearSession, navigate]);

  const handleDropdownClose = useCallback(() => {
    setDropdownOpen(false);
  }, []);

  return (
    <div className="border-t border-[var(--color-border)] px-2 py-2">
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setDropdownOpen((prev) => !prev)}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-[var(--radius-md)] px-2 py-1.5 transition-colors hover:bg-[var(--color-surface-2)]",
            collapsed && "justify-center px-0",
          )}
          aria-expanded={dropdownOpen}
          aria-haspopup="true"
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
                {user?.employeeCode ?? ""}
              </p>
            </div>
          )}
        </button>

        {dropdownOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={handleDropdownClose}
              onKeyDown={(e) => {
                if (e.key === "Escape") handleDropdownClose();
              }}
            />
            <div className="absolute bottom-full start-0 z-50 mb-1 w-48 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] py-1 shadow-[var(--shadow-md)]">
              <Link
                to="/company/dashboard"
                className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]"
                onClick={handleDropdownClose}
              >
                <User size={14} />
                Profile
              </Link>
              <Link
                to="/company/dashboard"
                className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]"
                onClick={handleDropdownClose}
              >
                <Settings size={14} />
                Settings
              </Link>
              <div className="my-1 border-t border-[var(--color-border)]" />
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--color-danger)] hover:bg-[var(--color-surface-2)]"
              >
                <LogOut size={14} />
                Sign out
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
