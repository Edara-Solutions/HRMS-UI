import {
  BarChart3,
  Building2,
  Calendar,
  Clock,
  CreditCard,
  FileText,
  LayoutDashboard,
  Receipt,
  Settings,
  Shield,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";

export interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

// Icon size constant to avoid inline object creation
const ICON_SIZE = 18;

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
    title: "People",
    items: [
      {
        label: "Employees",
        href: "/company/people",
        icon: <Users size={ICON_SIZE} />,
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
    title: "Operations",
    items: [
      {
        label: "Payroll",
        href: "/company/payroll",
        icon: <CreditCard size={ICON_SIZE} />,
      },
      {
        label: "Documents",
        href: "/company/documents",
        icon: <FileText size={ICON_SIZE} />,
      },
      {
        label: "Reports",
        href: "/company/reports",
        icon: <BarChart3 size={ICON_SIZE} />,
      },
    ],
  },
  {
    title: "System",
    items: [
      {
        label: "Settings",
        href: "/company/settings",
        icon: <Settings size={ICON_SIZE} />,
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
        label: "Audit Log",
        href: "/admin/audit",
        icon: <Shield size={ICON_SIZE} />,
      },
    ],
  },
];
