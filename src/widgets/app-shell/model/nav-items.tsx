import {
  BarChart3,
  Building2,
  Calendar,
  CheckCircle,
  ClipboardCheck,
  Clock,
  CreditCard,
  FileText,
  LayoutDashboard,
  Mail,
  Network,
  PackageSearch,
  PauseCircle,
  Receipt,
  Settings,
  Shield,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import type { PermissionAction } from "@/shared/auth";
import type { SupportedLocale } from "@/shared/i18n";

export interface NavItem {
  label: string;
  /** Optional translated labels keyed by the application's active locale. */
  localizedLabels?: Partial<Record<SupportedLocale, string>>;
  href: string;
  icon: ReactNode;
  indicator?: NavIndicator;
  permission?: PermissionAction;
}

export interface NavIndicator {
  label: string;
  tone: "neutral" | "primary" | "info" | "success" | "warning" | "danger";
  effect?: "none" | "pulse";
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

const ICON_SIZE = 16;

export const companyNavGroups: NavGroup[] = [
  {
    title: "Overview",
    items: [
      {
        label: "Dashboard",
        href: "/company/dashboard",
        icon: <LayoutDashboard size={ICON_SIZE} />,
      },
    ],
  },
  {
    title: "Workforce",
    items: [
      {
        label: "People",
        href: "/company/people",
        icon: <Users size={ICON_SIZE} />,
        indicator: { label: "248", tone: "info", effect: "pulse" },
      },
      {
        label: "Org Chart",
        href: "/company/org-chart",
        icon: <Network size={ICON_SIZE} />,
      },
      {
        label: "Time Off",
        href: "/company/time-off",
        icon: <Calendar size={ICON_SIZE} />,
      },
      {
        label: "Attendance",
        href: "/company/attendance",
        icon: <Clock size={ICON_SIZE} />,
      },
    ],
  },
  {
    title: "Finance",
    items: [
      {
        label: "Payroll",
        href: "/company/payroll",
        icon: <CreditCard size={ICON_SIZE} />,
        indicator: { label: "May", tone: "primary", effect: "pulse" },
      },
    ],
  },
  {
    title: "Talent",
    items: [
      {
        label: "Recruitment",
        href: "/company/recruitment",
        icon: <UserPlus size={ICON_SIZE} />,
        indicator: { label: "14", tone: "warning", effect: "pulse" },
      },
      {
        label: "Onboarding",
        href: "/company/onboarding",
        icon: <CheckCircle size={ICON_SIZE} />,
      },
      {
        label: "Performance",
        href: "/company/performance",
        icon: <TrendingUp size={ICON_SIZE} />,
      },
    ],
  },
  {
    title: "Operations",
    items: [
      {
        label: "Email settings",
        href: "/company/email-settings",
        icon: <Mail size={ICON_SIZE} />,
        permission: "companies:email-settings:read",
      },
      {
        label: "Documents",
        href: "/company/documents",
        icon: <FileText size={ICON_SIZE} />,
      },
      {
        label: "Approvals",
        href: "/company/approvals",
        icon: <CheckCircle size={ICON_SIZE} />,
        indicator: { label: "11", tone: "danger", effect: "pulse" },
      },
      {
        label: "Reports",
        href: "/company/reports",
        icon: <BarChart3 size={ICON_SIZE} />,
      },
    ],
  },
];

export const adminNavGroups: NavGroup[] = [
  {
    title: "Overview",
    items: [
      {
        label: "Dashboard",
        href: "/admin/dashboard",
        icon: <LayoutDashboard size={ICON_SIZE} />,
      },
    ],
  },
  {
    title: "Management",
    items: [
      {
        label: "Companies",
        href: "/admin/companies",
        icon: <Building2 size={ICON_SIZE} />,
        indicator: { label: "142", tone: "info", effect: "pulse" },
      },
      {
        label: "Subscriptions",
        href: "/admin/subscriptions",
        icon: <Receipt size={ICON_SIZE} />,
      },
      {
        label: "Leads",
        href: "/admin/leads",
        icon: <Users size={ICON_SIZE} />,
      },
      {
        label: "Plans",
        href: "/admin/plans",
        icon: <PackageSearch size={ICON_SIZE} />,
      },
      {
        label: "Conversion requests",
        href: "/admin/conversion-requests",
        icon: <ClipboardCheck size={ICON_SIZE} />,
        permission: "APPROVE_LEAD_CONVERSION_REQUEST",
      },
    ],
  },
  {
    title: "Analytics",
    items: [
      {
        label: "Reports",
        href: "/admin/reports",
        icon: <BarChart3 size={ICON_SIZE} />,
      },
    ],
  },
  {
    title: "System",
    items: [
      {
        label: "Settings",
        href: "/admin/settings",
        icon: <Settings size={ICON_SIZE} />,
      },
      {
        label: "Email",
        localizedLabels: { ar: "البريد" },
        href: "/admin/email",
        icon: <Mail size={ICON_SIZE} />,
      },
      {
        label: "Email Deliveries",
        localizedLabels: { ar: "عمليات تسليم البريد" },
        href: "/admin/email/deliveries",
        icon: <Mail size={ICON_SIZE} />,
      },
      {
        label: "Sending Controls",
        localizedLabels: { ar: "ضوابط الإرسال" },
        href: "/admin/email/sending",
        icon: <PauseCircle size={ICON_SIZE} />,
      },
      {
        label: "Audit Log",
        href: "/admin/audit",
        icon: <Shield size={ICON_SIZE} />,
      },
    ],
  },
];
