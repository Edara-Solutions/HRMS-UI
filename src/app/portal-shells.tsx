import { useQuery } from "@tanstack/react-query";
import { Shield } from "lucide-react";
import type { ReactNode } from "react";
import { NotificationBell, NotificationToaster } from "@/features/notification";
import { companyOverviewQuery, platformOverviewQuery } from "@/shared/api";
import { useCompanySession, usePlatformSession } from "@/shared/auth";
import { usePreferencesStore } from "@/shared/config";
import {
  AppShell,
  buildNavGroups,
  Header,
  isUpcomingModulesEnabled,
  SessionFooter,
} from "@/widgets/app-shell";

/** Each audience header carries its own bell; a header has no per-render input, so both are built once. */
const companyHeader = <Header notifications={<NotificationBell />} />;
const platformHeader = <Header notifications={<NotificationBell />} />;
const showUpcoming = isUpcomingModulesEnabled();
const platformBadgeReads = ["companies:read", "leads:read", "lead-conversion-requests:read"];

export function CompanyShell({ children }: { children: ReactNode }) {
  const session = useCompanySession((state) => state.session);
  const locale = usePreferencesStore((state) => state.locale);
  const readsPeople =
    session?.user.isOwner === true || session?.user.permissions.includes("users:read") === true;
  const { data: overview } = useQuery({
    ...companyOverviewQuery(session?.user.publicId ?? ""),
    enabled: session !== null && readsPeople,
  });
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
        { showUpcoming, counts: { people: overview?.people?.total } },
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
  const readsBadges = platformBadgeReads.some((action) =>
    session?.user.permissions.includes(action),
  );
  const { data: overview } = useQuery({
    ...platformOverviewQuery(session?.user.publicId ?? ""),
    enabled: session !== null && readsBadges,
  });
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
        {
          showUpcoming,
          counts: {
            companies: overview?.companies?.total,
            leads: overview?.leads?.open,
            "conversion-requests": overview?.conversionRequests?.pending,
          },
        },
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
