import { useQuery } from "@tanstack/react-query";
import { Shield } from "lucide-react";
import { type ReactNode, useMemo } from "react";
import { accessRequestQueries } from "@/features/access-request";
import { CommandPalette, HelpMenu, type PaletteIdentity } from "@/features/command-palette";
import { NotificationBell, NotificationToaster } from "@/features/notification";
import { companyOverviewQuery, platformOverviewQuery } from "@/shared/api";
import { useCompanySession, usePlatformSession } from "@/shared/auth";
import { usePreferencesStore } from "@/shared/config";
import {
  AppShell,
  buildNavGroups,
  Header,
  isUpcomingModulesEnabled,
  type NavGroup,
  SessionFooter,
} from "@/widgets/app-shell";

const showUpcoming = isUpcomingModulesEnabled();
const platformBadgeReads = ["companies:read", "leads:read", "lead-conversion-requests:read"];
const notifications = <NotificationBell />;
const help = <HelpMenu />;

function palettePages(groups: readonly NavGroup[]) {
  return groups.flatMap((group) =>
    group.items.flatMap((item) => (item.upcoming ? [] : [{ label: item.label, href: item.href }])),
  );
}

function ShellHeader({ identity, groups }: { identity: PaletteIdentity; groups: NavGroup[] }) {
  const search = useMemo(
    () => <CommandPalette identity={identity} pages={palettePages(groups)} />,
    [identity, groups],
  );
  return <Header search={search} help={help} notifications={notifications} />;
}

export function CompanyShell({ children }: { children: ReactNode }) {
  const session = useCompanySession((state) => state.session);
  const locale = usePreferencesStore((state) => state.locale);
  const readsPeople =
    session?.user.isOwner === true || session?.user.permissions.includes("users:read") === true;
  const { data: overview } = useQuery({
    ...companyOverviewQuery(session?.user.publicId ?? ""),
    enabled: session !== null && readsPeople,
  });
  const identity = useMemo<PaletteIdentity | null>(
    () =>
      session && {
        audience: "company",
        userPublicId: session.user.publicId,
        permissions: session.user.permissions,
        owner: session.user.isOwner,
      },
    [session],
  );
  const people = overview?.people?.total;
  const groups = useMemo(
    () =>
      identity
        ? buildNavGroups({ ...identity, authenticated: true }, locale, {
            showUpcoming,
            counts: { people },
          })
        : [],
    [identity, locale, people],
  );
  if (!session || !identity) return null;
  return (
    <AppShell
      branding={{
        label: "Edara",
        subtitle: locale === "ar" ? "إدارة الأفراد" : "People Operations",
        icon: <span>E</span>,
      }}
      groups={groups}
      preferenceScope={`company:${session.user.publicId}`}
      header={<ShellHeader identity={identity} groups={groups} />}
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
  const { data: accessReview } = useQuery({
    ...accessRequestQueries(session?.user.publicId ?? "").review("review"),
    enabled: session?.user.permissions.includes("delegation:approve") === true,
  });
  const identity = useMemo<PaletteIdentity | null>(
    () =>
      session && {
        audience: "platform",
        userPublicId: session.user.publicId,
        permissions: session.user.permissions,
      },
    [session],
  );
  const companies = overview?.companies?.total;
  const leads = overview?.leads?.open;
  const pending = overview?.conversionRequests?.pending;
  const awaitingDecision = accessReview?.items.filter(
    (request) => request.requester.publicId !== session?.user.publicId,
  ).length;
  const groups = useMemo(
    () =>
      identity
        ? buildNavGroups({ ...identity, authenticated: true }, locale, {
            showUpcoming,
            counts: {
              companies,
              leads,
              "conversion-requests": pending,
              "access-requests": awaitingDecision,
            },
          })
        : [],
    [identity, locale, companies, leads, pending, awaitingDecision],
  );
  if (!session || !identity) return null;
  return (
    <AppShell
      branding={{
        label: "Edara Platform",
        subtitle: locale === "ar" ? "وحدة العمليات" : "Operations Console",
        icon: <Shield size={14} />,
      }}
      groups={groups}
      preferenceScope={`platform:${session.user.publicId}`}
      header={<ShellHeader identity={identity} groups={groups} />}
      identity={(collapsed) => <SessionFooter collapsed={collapsed} />}
    >
      {children}
      <NotificationToaster />
    </AppShell>
  );
}
