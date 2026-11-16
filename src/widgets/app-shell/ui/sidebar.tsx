import { useMutation } from "@tanstack/react-query";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { ChevronUp, LockKeyhole, LogOut, Monitor, PanelLeft, UserRound } from "lucide-react";
import {
  type ReactNode,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useCurrentAudience, useCurrentSession } from "@/shared/auth";
import { usePreferencesStore } from "@/shared/config";
import { cn } from "@/shared/lib/cn";
import { Avatar } from "@/shared/ui/avatar";
import { useEasedNumber } from "../lib/use-eased-number";
import type { NavGroup, NavIndicator, NavItem } from "../model/nav-items";

interface SidebarProps {
  groups: NavGroup[];
  portalLabel: string;
  portalSubtitle: string;
  portalIcon: ReactNode;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  footer?: ReactNode;
}

export function Sidebar({
  groups,
  portalLabel,
  portalSubtitle,
  portalIcon,
  collapsed,
  onToggleCollapsed,
  footer,
}: SidebarProps) {
  const locale = usePreferencesStore((state) => state.locale);
  const visibleGroups = groups;
  const { pathname } = useLocation();
  const matchingItems = visibleGroups.reduce<NavItem[]>((result, group) => {
    for (const item of group.items) {
      if (pathname === item.href || pathname.startsWith(`${item.href}/`)) result.push(item);
    }
    return result;
  }, []);
  const activeHref = matchingItems.reduce<string | undefined>(
    (longestHref, item) =>
      !longestHref || item.href.length > longestHref.length ? item.href : longestHref,
    undefined,
  );

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
        <SidebarBrandToggle
          collapsed={collapsed}
          icon={portalIcon}
          label={portalLabel}
          onToggle={onToggleCollapsed}
        />
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold tracking-tight text-[var(--color-text)]">
              {portalLabel}
            </p>
            <span className="text-[11px] text-[var(--color-text-faint)]">{portalSubtitle}</span>
          </div>
        )}
        {!collapsed && (
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="ms-auto flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-[var(--color-text-faint)] transition-[background-color,color,transform] duration-[var(--motion-fast)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)] active:scale-95"
            aria-label={locale === "ar" ? "طي الشريط الجانبي" : "Collapse sidebar"}
          >
            <PanelLeft size={17} strokeWidth={1.9} className="shrink-0 rtl:-scale-x-100" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="scrollbar-calm scrollbar-stable flex-1 overflow-y-auto px-2.5 py-3">
        {visibleGroups.map((group) => (
          <div key={group.title} className="mb-5">
            {!collapsed && (
              <p className="mb-1.5 px-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-widest text-[var(--color-text-faint)]">
                {group.title}
              </p>
            )}
            <ul className="flex flex-col gap-px">
              {group.items.map((item) => (
                <SidebarLink
                  key={item.href}
                  item={item}
                  collapsed={collapsed}
                  isActive={item.href === activeHref}
                />
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      {footer ?? <SessionFooter collapsed={collapsed} />}
    </aside>
  );
}

function SidebarBrandToggle({
  collapsed,
  icon,
  label,
  onToggle,
}: {
  collapsed: boolean;
  icon: ReactNode;
  label: string;
  onToggle: () => void;
}) {
  const locale = usePreferencesStore((state) => state.locale);
  if (!collapsed) {
    return (
      <div className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-text)] text-[13px] font-bold leading-none text-[var(--color-surface)]">
        {icon}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "group relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius-md)]",
        "text-[13px] font-bold leading-none text-[var(--color-surface)]",
        "transition-[background-color,color,transform] duration-[var(--motion-fast)]",
        "hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)] active:scale-95",
        "focus-visible:bg-[var(--color-surface-2)] focus-visible:text-[var(--color-text)]",
      )}
      aria-label={locale === "ar" ? `توسيع الشريط الجانبي ${label}` : `Expand ${label} sidebar`}
      title={locale === "ar" ? `توسيع الشريط الجانبي ${label}` : `Expand ${label} sidebar`}
    >
      <span className="absolute inset-0 rounded-[var(--radius-md)] bg-[var(--color-text)] transition-opacity duration-[var(--motion-fast)] group-hover:opacity-0 group-focus-visible:opacity-0" />
      <span className="relative transition-opacity duration-[var(--motion-fast)] group-hover:opacity-0 group-focus-visible:opacity-0">
        {icon}
      </span>
      <PanelLeft
        size={17}
        strokeWidth={1.9}
        className="absolute shrink-0 opacity-0 transition-opacity duration-[var(--motion-fast)] group-hover:opacity-100 group-focus-visible:opacity-100 rtl:-scale-x-100"
      />
    </button>
  );
}

interface SidebarLinkProps {
  item: NavItem;
  collapsed: boolean;
  isActive: boolean;
}

const linkClassName =
  "relative flex items-center gap-[9px] rounded-[var(--radius-md)] px-2.5 py-2 text-[13.5px] font-medium transition-[background-color,color,box-shadow] duration-[var(--motion-fast)]";

function SidebarLink({ item, collapsed, isActive }: SidebarLinkProps) {
  if (item.upcoming) return <UpcomingEntry item={item} collapsed={collapsed} />;
  const indicator = item.indicator;

  return (
    <li>
      <Link
        to={item.href}
        className={cn(
          linkClassName,
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
            {indicator && <CountBadge indicator={indicator} isActive={isActive} />}
          </>
        )}
        {collapsed && indicator && <CollapsedDot indicator={indicator} />}
      </Link>
    </li>
  );
}

function UpcomingEntry({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const locale = usePreferencesStore((state) => state.locale);
  const soon = locale === "ar" ? "قريبًا" : "Soon";

  return (
    <li>
      <span
        aria-disabled="true"
        title={collapsed ? `${item.label} · ${soon}` : undefined}
        className={cn(
          linkClassName,
          "cursor-default select-none text-[var(--color-text-faint)]",
          collapsed && "justify-center px-0",
        )}
      >
        <span className="shrink-0 opacity-50">{item.icon}</span>
        {!collapsed && (
          <>
            <span className="truncate">{item.label}</span>
            <span className="ms-auto rounded-[var(--radius-sm)] border border-[var(--color-border)] px-1.5 py-px text-[10px] font-medium leading-4 text-[var(--color-text-faint)]">
              {soon}
            </span>
          </>
        )}
      </span>
    </li>
  );
}

function CountBadge({ indicator, isActive }: { indicator: NavIndicator; isActive: boolean }) {
  const shown = useEasedNumber(indicator.count);

  return (
    <span
      className={cn(
        "ms-auto inline-flex h-5 min-w-[20px] items-center justify-center gap-1.5 rounded-[var(--radius-sm)]",
        "border px-1.5 text-[10px] font-semibold tabular-nums leading-none",
        "transition-[background-color,border-color,color] duration-[var(--motion-fast)]",
        isActive
          ? "border-[color-mix(in_srgb,var(--color-primary)_25%,transparent)] bg-[var(--color-surface)] text-[var(--color-primary)]"
          : "border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-muted)]",
      )}
    >
      {indicator.attention && (
        <span
          aria-hidden="true"
          className="attention-dot size-1.5 shrink-0 rounded-full bg-[var(--color-primary)]"
        />
      )}
      {shown.toLocaleString()}
    </span>
  );
}

function CollapsedDot({ indicator }: { indicator: NavIndicator }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "absolute end-2 top-1.5 size-1.5 rounded-full shadow-[0_0_0_1.5px_var(--color-surface)]",
        indicator.attention
          ? "attention-dot bg-[var(--color-primary)]"
          : "bg-[var(--color-text-faint)]",
      )}
    />
  );
}

const selfPages = [
  {
    path: "profile",
    icon: <UserRound size={14} className="shrink-0 opacity-70" />,
    label: { en: "My profile", ar: "ملفي الشخصي" },
  },
  {
    path: "security",
    icon: <LockKeyhole size={14} className="shrink-0 opacity-70" />,
    label: { en: "Security", ar: "الأمان" },
  },
  {
    path: "sessions",
    icon: <Monitor size={14} className="shrink-0 opacity-70" />,
    label: { en: "My sessions", ar: "جلساتي" },
  },
] as const;

function UserMenu({
  onClose,
  triggerRef,
}: {
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const audience = useCurrentAudience();
  const locale = usePreferencesStore((state) => state.locale);
  const navigate = useNavigate();
  const logout = useMutation({
    retry: false,
    mutationFn: async () => {
      if (audience === "company") return (await import("@/shared/company-auth")).signOutCompany();
      if (audience === "platform")
        return (await import("@/shared/platform-auth")).signOutPlatform();
      throw new Error("Session unavailable");
    },
    onSuccess: (result) => {
      onClose();
      void navigate({
        to: audience === "platform" ? "/platform/login" : "/company/login",
        search: { localSignOutOnly: !result.remoteConfirmed },
      });
    },
  });
  const menuRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({
    position: "fixed",
    visibility: "hidden",
  });

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

  const handleClose = useEffectEvent(onClose);

  useEffect(() => {
    function handlePointer(e: MouseEvent) {
      if (
        menuRef.current?.contains(e.target as Node) ||
        triggerRef.current?.contains(e.target as Node)
      )
        return;
      handleClose();
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [triggerRef]);

  function handleLogout() {
    if (!logout.isPending) logout.mutate();
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
      {selfPages.map(({ path, icon, label }) => (
        <Link
          key={path}
          to={`/${audience === "platform" ? "platform" : "company"}/me/${path}`}
          className={itemClass}
          onClick={onClose}
          role="menuitem"
        >
          {icon}
          <span>{label[locale]}</span>
        </Link>
      ))}
      <hr className="my-1 h-px border-0 bg-[var(--color-border)]" />
      <button
        type="button"
        className={cn(
          itemClass,
          "text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)] hover:text-[var(--color-danger)]",
        )}
        onClick={handleLogout}
        disabled={logout.isPending}
        role="menuitem"
      >
        <LogOut size={14} className="shrink-0" />
        <span>{locale === "ar" ? "تسجيل الخروج" : "Sign out"}</span>
      </button>
    </div>,
    document.body,
  );
}

export function SessionFooter({ collapsed = false }: { collapsed?: boolean }) {
  const locale = usePreferencesStore((state) => state.locale);
  const user = useCurrentSession()?.user;
  const [menuOpen, setMenuOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="border-t border-[var(--color-border)] px-2.5 py-3">
      {menuOpen && <UserMenu onClose={() => setMenuOpen(false)} triggerRef={triggerRef} />}
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
        aria-label={locale === "ar" ? "قائمة المستخدم" : "User menu"}
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
                {user && "roleNames" in user
                  ? [locale === "ar" ? "مستخدم المنصة" : "Platform User", ...user.roleNames].join(
                      " · ",
                    )
                  : locale === "ar"
                    ? "مستخدم الشركة"
                    : "Company User"}
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
