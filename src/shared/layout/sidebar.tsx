import { useAuthStore } from "@/auth/store";
import type { NavGroup, NavIndicator, NavItem } from "@/shared/layout/nav-items";
import { cn } from "@/shared/lib/cn";
import { Avatar } from "@/shared/ui/avatar";
import { Link, useMatchRoute, useNavigate } from "@tanstack/react-router";
import { ChevronUp, LogOut, Settings, User } from "lucide-react";
import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface SidebarProps {
  groups: NavGroup[];
  portalLabel: string;
  portalSubtitle: string;
  portalIcon: ReactNode;
  collapsed: boolean;
}

export function Sidebar({
  groups,
  portalLabel,
  portalSubtitle,
  portalIcon,
  collapsed,
}: SidebarProps) {
  return (
    <aside
      className={cn(
        "flex h-dvh shrink-0 flex-col overflow-hidden border-e border-[var(--color-border)] bg-[var(--color-surface)]",
        "transition-[width] duration-[var(--motion-base)] ease-[var(--motion-easing)]",
        collapsed ? "w-[60px]" : "w-[252px]",
      )}
    >
      {/* Brand */}
      <div
        className={cn(
          "flex items-center gap-2.5 border-b border-[var(--color-border)] py-5",
          collapsed ? "justify-center px-0" : "px-4",
        )}
      >
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
      </div>

      {/* Navigation */}
      <nav className="scrollbar-calm scrollbar-stable flex-1 overflow-y-auto px-2.5 py-3">
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
  item: NavItem;
  collapsed: boolean;
}

// Expanded badge: color-mixed background gives more saturation than pure -soft while staying readable
const indicatorClassName: Record<NavIndicator["tone"], string> = {
  neutral: "bg-[var(--color-surface-2)] text-[var(--color-text-muted)]",
  primary: "bg-[color-mix(in_srgb,var(--color-primary)_30%,var(--color-primary-soft))] text-[var(--color-primary)]",
  info:    "bg-[color-mix(in_srgb,var(--color-info)_30%,var(--color-info-soft))] text-[var(--color-info)]",
  success: "bg-[color-mix(in_srgb,var(--color-success)_30%,var(--color-success-soft))] text-[var(--color-success)]",
  warning: "bg-[color-mix(in_srgb,var(--color-warning)_30%,var(--color-warning-soft))] text-[var(--color-warning)]",
  danger:  "bg-[color-mix(in_srgb,var(--color-danger)_30%,var(--color-danger-soft))] text-[var(--color-danger)]",
};

// Collapsed dot: solid semantic colour so the dot is vivid in both light and dark themes.
// Setting both bg and text to the same token means currentColor (used in the glow shadow) == the dot colour.
const dotClassName: Record<NavIndicator["tone"], string> = {
  neutral: "bg-[var(--color-text-faint)] text-[var(--color-text-faint)]",
  primary: "bg-[var(--color-primary)] text-[var(--color-primary)]",
  info:    "bg-[var(--color-info)] text-[var(--color-info)]",
  success: "bg-[var(--color-success)] text-[var(--color-success)]",
  warning: "bg-[var(--color-warning)] text-[var(--color-warning)]",
  danger:  "bg-[var(--color-danger)] text-[var(--color-danger)]",
};

function SidebarLink({ item, collapsed }: SidebarLinkProps) {
  const matchRoute = useMatchRoute();
  const isActive = matchRoute({ to: item.href, fuzzy: true });
  const indicator = item.indicator;

  return (
    <li>
      <Link
        to={item.href}
        className={cn(
          "relative flex items-center gap-[9px] rounded-[var(--radius-md)] px-2.5 py-2 text-[13.5px] font-medium transition-[background-color,color,box-shadow] duration-[var(--motion-fast)]",
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
            {indicator && <SidebarIndicator indicator={indicator} isActive={Boolean(isActive)} />}
          </>
        )}
        {collapsed && indicator && (
          <SidebarIndicatorDot indicator={indicator} isActive={Boolean(isActive)} />
        )}
      </Link>
    </li>
  );
}

function SidebarIndicator({
  indicator,
  isActive,
}: {
  indicator: NavIndicator;
  isActive: boolean;
}) {
  return (
    <span
      className={cn(
        "ms-auto inline-flex h-5 min-w-[20px] items-center justify-center rounded-[var(--radius-sm)]",
        "px-1.5 text-[10px] font-semibold tabular-nums leading-none",
        // Always-visible tinted border gives the badge a defined edge in both themes
        "border border-[color-mix(in_srgb,currentColor_35%,transparent)]",
        "transition-[transform,box-shadow] duration-[var(--motion-fast)]",
        indicatorClassName[indicator.tone],
        // Active: badge swells slightly and gains a soft outer ring
        isActive && "scale-[1.04] shadow-[0_0_0_2px_color-mix(in_srgb,currentColor_28%,transparent)]",
        indicator.effect === "pulse" && "motion-safe:animate-pulse",
      )}
    >
      {indicator.label}
    </span>
  );
}

function SidebarIndicatorDot({
  indicator,
  isActive,
}: {
  indicator: NavIndicator;
  isActive: boolean;
}) {
  return (
    <span
      className={cn(
        // Solid semantic colour (not soft) so the dot is vivid against the sidebar in both themes
        "absolute end-1.5 top-1.5 size-2 rounded-full",
        "transition-[transform,box-shadow] duration-[var(--motion-fast)]",
        dotClassName[indicator.tone],
        // Compound shadow: inner ring separates dot from icon; outer glow uses the dot's own colour
        // Ring colour adapts: surface when inactive, primary-soft when the link is active
        isActive
          ? "scale-125 shadow-[0_0_0_1.5px_var(--color-primary-soft),0_0_6px_1px_color-mix(in_srgb,currentColor_65%,transparent)]"
          : "shadow-[0_0_0_1.5px_var(--color-surface),0_0_5px_1px_color-mix(in_srgb,currentColor_50%,transparent)]",
        indicator.effect === "pulse" && "motion-safe:animate-pulse",
      )}
      aria-label={indicator.label}
    />
  );
}

function UserMenu({
  onClose,
  triggerRef,
}: {
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const clearSession = useAuthStore((s) => s.clearSession);
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({ position: "fixed", visibility: "hidden" });

  useLayoutEffect(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const isRTL = document.documentElement.dir === "rtl";
    setStyle(
      isRTL
        ? {
            position: "fixed",
            visibility: "visible",
            bottom: window.innerHeight - rect.top + 6,
            right: window.innerWidth - rect.right,
            minWidth: Math.max(rect.width, 200),
          }
        : {
            position: "fixed",
            visibility: "visible",
            bottom: window.innerHeight - rect.top + 6,
            left: rect.left,
            minWidth: Math.max(rect.width, 200),
          },
    );
  }, [triggerRef]);

  useEffect(() => {
    function handlePointer(e: MouseEvent) {
      if (
        menuRef.current?.contains(e.target as Node) ||
        triggerRef.current?.contains(e.target as Node)
      )
        return;
      onClose();
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose, triggerRef]);

  function handleLogout() {
    clearSession();
    onClose();
    navigate({ to: "/login" });
  }

  const itemClass =
    "flex w-full items-center gap-2.5 rounded-[var(--radius-md)] px-3 py-2 text-[13px] text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]";

  return createPortal(
    <div
      ref={menuRef}
      style={style}
      className="z-50 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-1 shadow-[var(--shadow-md)]"
      role="menu"
    >
      <Link
        to="/company/dashboard"
        className={itemClass}
        onClick={onClose}
        role="menuitem"
      >
        <User size={14} className="shrink-0 opacity-70" />
        <span>Profile</span>
      </Link>
      <Link
        to="/company/dashboard"
        className={itemClass}
        onClick={onClose}
        role="menuitem"
      >
        <Settings size={14} className="shrink-0 opacity-70" />
        <span>Settings</span>
      </Link>
      <div className="my-1 h-px bg-[var(--color-border)]" role="separator" />
      <button type="button" className={cn(itemClass, "text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)] hover:text-[var(--color-danger)]")} onClick={handleLogout} role="menuitem">
        <LogOut size={14} className="shrink-0" />
        <span>Sign out</span>
      </button>
    </div>,
    document.body,
  );
}

function SidebarFooter({ collapsed }: { collapsed: boolean }) {
  const user = useAuthStore((state) => state.session?.user);
  const [menuOpen, setMenuOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="border-t border-[var(--color-border)] px-2.5 py-3">
      {menuOpen && (
        <UserMenu onClose={() => setMenuOpen(false)} triggerRef={triggerRef} />
      )}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setMenuOpen((prev) => !prev)}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-[var(--radius-lg)] px-2.5 py-2 transition-colors hover:bg-[var(--color-surface-2)]",
          collapsed && "justify-center px-0",
          menuOpen && "bg-[var(--color-surface-2)]",
        )}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-label="User menu"
      >
        <Avatar
          size="sm"
          initials={user ? `${user.firstName[0]}${user.lastName[0]}` : "?"}
          alt={user ? `${user.firstName} ${user.lastName}` : "User"}
        />
        {!collapsed && (
          <>
            <div className="min-w-0 flex-1 text-start">
              <p className="truncate text-[13px] font-semibold text-[var(--color-text)]">
                {user ? `${user.firstName} ${user.lastName}` : "User"}
              </p>
              <p className="truncate text-[11px] text-[var(--color-text-faint)]">
                {user?.status === "ACTIVE" ? "Employee" : (user?.status ?? "")}
              </p>
            </div>
            <ChevronUp
              size={12}
              className={cn(
                "shrink-0 text-[var(--color-text-faint)] transition-transform duration-[var(--motion-fast)]",
                !menuOpen && "rotate-180",
              )}
            />
          </>
        )}
      </button>
    </div>
  );
}
