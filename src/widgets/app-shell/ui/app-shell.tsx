import { type ReactNode, useCallback, useSyncExternalStore } from "react";
import { defaultPresentation, type PreferenceScope, usePreferencesStore } from "@/shared/config";
import type { NavGroup } from "../model/nav-items";
import { Sidebar } from "./sidebar";

interface AppShellProps {
  branding: { label: string; subtitle: string; icon: ReactNode };
  groups: NavGroup[];
  preferenceScope: PreferenceScope;
  header: ReactNode;
  identity: (collapsed: boolean) => ReactNode;
  children: ReactNode;
}
const compactViewportQuery = "(max-width: 767px)";
function subscribeToCompactViewport(onChange: () => void) {
  const media = window.matchMedia(compactViewportQuery);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}
function getCompactViewportSnapshot() {
  return typeof window !== "undefined" && window.matchMedia(compactViewportQuery).matches;
}

export function AppShell({
  branding,
  groups,
  preferenceScope,
  header,
  identity,
  children,
}: AppShellProps) {
  const collapsed = usePreferencesStore(
    (state) => (state.scopes[preferenceScope] ?? defaultPresentation).sidebarCollapsed,
  );
  const setPresentation = usePreferencesStore((state) => state.setPresentation);
  const compact = useSyncExternalStore(
    subscribeToCompactViewport,
    getCompactViewportSnapshot,
    () => false,
  );
  const onToggle = useCallback(
    () => setPresentation(preferenceScope, { sidebarCollapsed: !collapsed }),
    [setPresentation, preferenceScope, collapsed],
  );
  return (
    <div className="relative flex h-dvh overflow-hidden bg-[var(--color-bg)]">
      <Sidebar
        groups={groups}
        portalLabel={branding.label}
        portalSubtitle={branding.subtitle}
        portalIcon={branding.icon}
        collapsed={collapsed || compact}
        onToggleCollapsed={onToggle}
        footer={identity(collapsed || compact)}
      />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {header}
        <main className="scrollbar-calm scrollbar-stable flex-1 overflow-x-clip overflow-y-auto">
          <div className="p-4 sm:p-5 lg:p-7">{children}</div>
        </main>
      </div>
    </div>
  );
}
