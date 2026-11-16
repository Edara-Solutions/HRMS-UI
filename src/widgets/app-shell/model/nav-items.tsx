import {
  ArrowRightLeft,
  BarChart3,
  BellRing,
  Building2,
  Calendar,
  CheckCircle,
  ClipboardCheck,
  Clock,
  ContactRound,
  CreditCard,
  FileText,
  History,
  IdCard,
  KeyRound,
  LayoutDashboard,
  Mail,
  MailCheck,
  Megaphone,
  Network,
  Package,
  Send,
  Settings,
  ShieldCheck,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import type { ReactNode } from "react";
import { type AccessFacts, type AudienceName, projectNavigation } from "@/shared/auth";
import type { SupportedLocale } from "@/shared/i18n";

type Localized = { en: string; ar: string };

export interface NavIndicator {
  count: number;
  attention: boolean;
}
export interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
  indicator?: NavIndicator;
  upcoming?: boolean;
}
export interface NavGroup {
  title: string;
  items: NavItem[];
}
export type NavCounts = Partial<Record<string, number>>;
export interface NavOptions {
  counts?: NavCounts;
  showUpcoming?: boolean;
}

type Entry =
  | { path: string; icon: ReactNode; attention?: boolean }
  | { upcoming: string; icon: ReactNode; label: Localized };

interface GroupSpec {
  title: Localized;
  entries: Entry[];
}

const soon = (upcoming: string, icon: ReactNode, label: Localized): Entry => ({
  upcoming,
  icon,
  label,
});

const groupMap: Record<AudienceName, GroupSpec[]> = {
  company: [
    {
      title: { en: "Overview", ar: "نظرة عامة" },
      entries: [
        { path: "dashboard", icon: <LayoutDashboard size={17} /> },
        { path: "profile", icon: <IdCard size={17} /> },
        { path: "setup", icon: <ClipboardCheck size={17} /> },
      ],
    },
    {
      title: { en: "Workforce", ar: "القوى العاملة" },
      entries: [
        { path: "people", icon: <Users size={17} /> },
        { path: "roles", icon: <KeyRound size={17} /> },
        soon("org-chart", <Network size={17} />, { en: "Org Chart", ar: "الهيكل التنظيمي" }),
        soon("time-off", <Calendar size={17} />, { en: "Time Off", ar: "الإجازات" }),
        soon("attendance", <Clock size={17} />, { en: "Attendance", ar: "الحضور" }),
      ],
    },
    {
      title: { en: "Finance", ar: "المالية" },
      entries: [soon("payroll", <Wallet size={17} />, { en: "Payroll", ar: "الرواتب" })],
    },
    {
      title: { en: "Talent", ar: "المواهب" },
      entries: [
        soon("recruitment", <UserPlus size={17} />, { en: "Recruitment", ar: "التوظيف" }),
        soon("onboarding", <CheckCircle size={17} />, { en: "Onboarding", ar: "التهيئة" }),
        soon("performance", <TrendingUp size={17} />, { en: "Performance", ar: "الأداء" }),
      ],
    },
    {
      title: { en: "Operations", ar: "العمليات" },
      entries: [
        { path: "email", icon: <Mail size={17} /> },
        { path: "notifications", icon: <BellRing size={17} /> },
        soon("documents", <FileText size={17} />, { en: "Documents", ar: "المستندات" }),
        soon("approvals", <CheckCircle size={17} />, { en: "Approvals", ar: "الموافقات" }),
        soon("reports", <BarChart3 size={17} />, { en: "Reports", ar: "التقارير" }),
        { path: "audit", icon: <History size={17} /> },
      ],
    },
  ],
  platform: [
    {
      title: { en: "Overview", ar: "نظرة عامة" },
      entries: [{ path: "dashboard", icon: <LayoutDashboard size={17} /> }],
    },
    {
      title: { en: "Management", ar: "الإدارة" },
      entries: [
        { path: "companies", icon: <Building2 size={17} /> },
        { path: "subscriptions", icon: <CreditCard size={17} /> },
        { path: "leads", icon: <ContactRound size={17} /> },
        { path: "plans", icon: <Package size={17} /> },
      ],
    },
    {
      title: { en: "Requests", ar: "الطلبات" },
      entries: [
        { path: "conversion-requests", icon: <ArrowRightLeft size={17} />, attention: true },
      ],
    },
    {
      title: { en: "People & access", ar: "الأفراد والصلاحيات" },
      entries: [
        { path: "people", icon: <Users size={17} /> },
        { path: "roles", icon: <ShieldCheck size={17} /> },
      ],
    },
    {
      title: { en: "Communications", ar: "الاتصالات" },
      entries: [
        { path: "announcements", icon: <Megaphone size={17} /> },
        { path: "notifications", icon: <BellRing size={17} /> },
        { path: "emails", icon: <Mail size={17} /> },
        { path: "email-deliveries", icon: <Send size={17} /> },
        { path: "email-sending", icon: <MailCheck size={17} /> },
      ],
    },
    {
      title: { en: "Analytics", ar: "التحليلات" },
      entries: [soon("reports", <BarChart3 size={17} />, { en: "Reports", ar: "التقارير" })],
    },
    {
      title: { en: "System", ar: "النظام" },
      entries: [
        soon("settings", <Settings size={17} />, { en: "Settings", ar: "الإعدادات" }),
        { path: "audit", icon: <History size={17} /> },
      ],
    },
  ],
};

export function isUpcomingModulesEnabled() {
  return import.meta.env.VITE_SHOW_UPCOMING_MODULES === "true";
}

export function buildNavGroups(
  facts: AccessFacts,
  locale: SupportedLocale,
  { counts = {}, showUpcoming = false }: NavOptions = {},
): NavGroup[] {
  const audience = facts.audience;
  if (!audience) return [];
  const prefix = `/${audience}/`;
  const permitted = new Map(
    projectNavigation(facts).flatMap((route) =>
      route.category === "work"
        ? [[route.path.slice(prefix.length), route.label?.[locale] ?? ""] as const]
        : [],
    ),
  );
  const toItem = (entry: Entry): NavItem | undefined => {
    if ("upcoming" in entry)
      return showUpcoming
        ? {
            label: entry.label[locale],
            href: `${prefix}${entry.upcoming}`,
            icon: entry.icon,
            upcoming: true,
          }
        : undefined;
    const label = permitted.get(entry.path);
    if (label === undefined) return undefined;
    const count = counts[entry.path] ?? 0;
    return {
      label,
      href: `${prefix}${entry.path}`,
      icon: entry.icon,
      ...(count > 0 && { indicator: { count, attention: entry.attention === true } }),
    };
  };
  return groupMap[audience].flatMap((group) => {
    const items = group.entries.flatMap((entry) => toItem(entry) ?? []);
    return items.length > 0 ? [{ title: group.title[locale], items }] : [];
  });
}
