import { Shield } from "lucide-react";
import type { ReactNode } from "react";
import { NotificationBell, NotificationToaster } from "@/features/notification";
import { useCompanySession, usePlatformSession } from "@/shared/auth";
import { usePreferencesStore } from "@/shared/config";
import { AppShell, buildNavGroups, Header, SessionFooter } from "@/widgets/app-shell";

/** Each audience header carries its own bell; a header has no per-render input, so both are built once. */
const companyHeader = <Header notifications={<NotificationBell />} />;
const platformHeader = <Header notifications={<NotificationBell />} />;

export function CompanyShell({ children }: { children: ReactNode }) {
  const session = useCompanySession((state) => state.session);
  const locale = usePreferencesStore((state) => state.locale);
  if (!session) return null;
  return (
    <AppShell
      branding={{
        label: "Edara",
        subtitle: locale === "ar" ? "إدارة الأفراد" : "People Operations",
        icon: <span>E</span>,
      }}
      groups={buildNavGroups(
        {
          audience: "company",
          authenticated: true,
          permissions: session.user.permissions,
          owner: session.user.isOwner,
        },
        locale,
      )}
      preferenceScope={`company:${session.user.publicId}`}
      header={companyHeader}
      identity={(collapsed) => <SessionFooter collapsed={collapsed} />}
    >
      {children}
      <NotificationToaster />
    </AppShell>
  );
}
export function PlatformShell({ children }: { children: ReactNode }) {
  const session = usePlatformSession((state) => state.session);
  const locale = usePreferencesStore((state) => state.locale);
  if (!session) return null;
  return (
    <AppShell
      branding={{
        label: "Edara Platform",
        subtitle: locale === "ar" ? "وحدة العمليات" : "Operations Console",
        icon: <Shield size={14} />,
      }}
      groups={buildNavGroups(
        { audience: "platform", authenticated: true, permissions: session.user.permissions },
        locale,
      )}
      preferenceScope={`platform:${session.user.publicId}`}
      header={platformHeader}
      identity={(collapsed) => <SessionFooter collapsed={collapsed} />}
    >
      {children}
      <NotificationToaster />
    </AppShell>
  );
}
