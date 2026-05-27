import type { NavGroup } from "@/shared/layout/nav-items";
import { cn } from "@/shared/lib/cn";
import { Link, useMatchRoute } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";

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
    </aside>
  );
}

interface SidebarLinkProps {
  item: { label: string; href: string; icon: ReactNode };
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
        {!collapsed && <span className="truncate">{item.label}</span>}
      </Link>
    </li>
  );
}
