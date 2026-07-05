export interface AdminKpiData {
  label: string;
  value: string;
  unit?: string;
  trend: { label: string; direction: "up" | "down" | "flat" };
  sparkline: number[];
  footer: string;
}

export interface RecentSignup {
  id: string;
  company: string;
  plan: string;
  date: string;
  status: { label: string; variant: "teal" | "warn" | "done" | "risk" };
  employees: number;
}

export interface SubscriptionDistribution {
  name: string;
  count: number;
  percentage: number;
  color: "primary" | "info" | "warning" | "success" | "faint";
}

export interface AdminActivity {
  id: string;
  text: string;
  module: string;
  time: string;
  dotColor: "primary" | "warning" | "success" | "default";
}

export const adminKpiData: AdminKpiData[] = [
  {
    label: "Total companies",
    value: "142",
    trend: { label: "+8 this month", direction: "up" },
    sparkline: [120, 125, 128, 130, 133, 136, 138, 142],
    footer: "5 trial · 127 active · 10 frozen",
  },
  {
    label: "Active subscriptions",
    value: "127",
    trend: { label: "92% retention", direction: "up" },
    sparkline: [110, 112, 115, 118, 120, 122, 125, 127],
    footer: "3 pending renewal",
  },
  {
    label: "Monthly revenue",
    value: "189,450",
    unit: "SAR",
    trend: { label: "+12% MoM", direction: "up" },
    sparkline: [140, 150, 155, 160, 168, 175, 182, 189],
    footer: "Annual run rate: 2.27M SAR",
  },
  {
    label: "System health",
    value: "99.8",
    unit: "%",
    trend: { label: "Stable", direction: "flat" },
    sparkline: [99.5, 99.7, 99.8, 99.6, 99.9, 99.8, 99.7, 99.8],
    footer: "Uptime last 30 days",
  },
];

export const recentSignups: RecentSignup[] = [
  {
    id: "1",
    company: "Nexus Technologies",
    plan: "Enterprise",
    date: "May 20, 2026",
    status: { label: "Active", variant: "teal" },
    employees: 85,
  },
  {
    id: "2",
    company: "CloudNine Solutions",
    plan: "Professional",
    date: "May 18, 2026",
    status: { label: "Onboarding", variant: "warn" },
    employees: 32,
  },
  {
    id: "3",
    company: "Digital Dynamics",
    plan: "Starter",
    date: "May 15, 2026",
    status: { label: "Trial", variant: "teal" },
    employees: 12,
  },
  {
    id: "4",
    company: "Innovate Corp",
    plan: "Enterprise",
    date: "May 12, 2026",
    status: { label: "Active", variant: "done" },
    employees: 156,
  },
  {
    id: "5",
    company: "Swift Systems",
    plan: "Professional",
    date: "May 10, 2026",
    status: { label: "Suspended", variant: "risk" },
    employees: 45,
  },
];

export const subscriptionDistribution: SubscriptionDistribution[] = [
  { name: "Enterprise", count: 42, percentage: 33, color: "primary" },
  { name: "Professional", count: 58, percentage: 46, color: "info" },
  { name: "Starter", count: 27, percentage: 21, color: "success" },
];

export const adminActivities: AdminActivity[] = [
  {
    id: "1",
    text: "Nexus Technologies upgraded to Enterprise plan",
    module: "Subscriptions",
    time: "2 hours ago",
    dotColor: "primary",
  },
  {
    id: "2",
    text: "Payment failed for Swift Systems — retry scheduled",
    module: "Billing",
    time: "4 hours ago",
    dotColor: "warning",
  },
  {
    id: "3",
    text: "CloudNine Solutions onboarding completed",
    module: "Companies",
    time: "6 hours ago",
    dotColor: "success",
  },
  {
    id: "4",
    text: "System maintenance completed — 0 downtime",
    module: "System",
    time: "12 hours ago",
    dotColor: "default",
  },
  {
    id: "5",
    text: "New lead from LinkedIn campaign: TechVista Inc",
    module: "Leads",
    time: "1 day ago",
    dotColor: "primary",
  },
];

export const revenueTrend = {
  months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  data: [120, 135, 142, 155, 162, 170, 175, 180, 185, 189, 195, 200],
  target: 210,
};
