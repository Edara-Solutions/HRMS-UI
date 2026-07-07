export interface KpiData {
  label: string;
  value: string;
  unit?: string;
  trend: { label: string; direction: "up" | "down" | "flat" };
  sparkline: number[];
  footer: string;
}

export interface ApprovalItem {
  id: string;
  initials: string;
  name: string;
  description: string;
  action: "Approve" | "Review" | "Open";
}

export interface EventItem {
  id: string;
  month: string;
  day: string;
  name: string;
  description: string;
}

export interface DepartmentData {
  name: string;
  count: number;
  percentage: number;
  color: "primary" | "info" | "warning" | "success" | "faint";
}

export interface ActivityItem {
  id: string;
  text: string;
  module: string;
  time: string;
  dotColor: "primary" | "warning" | "success" | "default";
}

export interface PeopleSpotlightItem {
  id: string;
  initials: string;
  name: string;
  role: string;
  department: string;
  status: { label: string; variant: "warn" | "teal" | "risk" | "done" | "info" };
  nextAction: string;
  timeOffBalance: string;
}

export const kpiData: KpiData[] = [
  {
    label: "Total headcount",
    value: "248",
    trend: { label: "+6 this month", direction: "up" },
    sparkline: [20, 17, 14, 11, 8, 5.5, 3.5, 2],
    footer: "2.5% from last month",
  },
  {
    label: "Open roles",
    value: "14",
    trend: { label: "3 added this week", direction: "up" },
    sparkline: [18, 14, 19, 11, 15, 8, 12, 7],
    footer: "Across 6 departments",
  },
  {
    label: "Avg. tenure",
    value: "2.4",
    unit: "yrs",
    trend: { label: "Stable", direction: "flat" },
    sparkline: [13, 11, 15, 12, 10, 14, 11, 10],
    footer: "Engineering leads at 3.1 yrs",
  },
  {
    label: "Pending approvals",
    value: "11",
    trend: { label: "Needs review", direction: "down" },
    sparkline: [17, 7, 16, 5, 13, 4, 9, 6],
    footer: "5 time off · 3 payroll · 3 contract",
  },
];

export const approvals: ApprovalItem[] = [
  {
    id: "1",
    initials: "MK",
    name: "Mariam Kamal",
    description: "Annual leave · Jun 2–6 · No conflicts",
    action: "Approve",
  },
  {
    id: "2",
    initials: "HA",
    name: "Hassan Ali",
    description: "Allowance adjustment · Finance check",
    action: "Review",
  },
  {
    id: "3",
    initials: "LR",
    name: "Lina Riad",
    description: "Contract renewal · Legal review pending",
    action: "Open",
  },
  {
    id: "4",
    initials: "AS",
    name: "Ahmed Samir",
    description: "Sick leave · Jun 5 · Docs attached",
    action: "Approve",
  },
];

export const events: EventItem[] = [
  {
    id: "1",
    month: "May",
    day: "22",
    name: "Payroll lock window",
    description: "10:00 · Finance & People checkpoint",
  },
  {
    id: "2",
    month: "May",
    day: "23",
    name: "Engineering onboarding",
    description: "4 new hires · Manager introductions",
  },
  {
    id: "3",
    month: "May",
    day: "26",
    name: "Performance calibration",
    description: "Q2 · Leadership review · People Ops room",
  },
  {
    id: "4",
    month: "May",
    day: "29",
    name: "Recruitment panel",
    description: "3 candidates · Engineering track",
  },
];

export const departments: DepartmentData[] = [
  { name: "Engineering", count: 72, percentage: 72, color: "primary" },
  { name: "Sales", count: 46, percentage: 46, color: "info" },
  { name: "Operations", count: 34, percentage: 34, color: "warning" },
  { name: "Product", count: 28, percentage: 28, color: "success" },
  { name: "Finance", count: 22, percentage: 22, color: "faint" },
  { name: "People Ops", count: 18, percentage: 18, color: "faint" },
];

export const activities: ActivityItem[] = [
  {
    id: "1",
    text: "Ahmed Samir signed the offer letter",
    module: "Recruitment",
    time: "12 minutes ago",
    dotColor: "primary",
  },
  {
    id: "2",
    text: "Attendance exception flagged for Operations team",
    module: "Attendance",
    time: "34 minutes ago",
    dotColor: "warning",
  },
  {
    id: "3",
    text: "May payroll variance review completed",
    module: "Payroll",
    time: "1 hour ago",
    dotColor: "success",
  },
  {
    id: "4",
    text: "Remote work policy updated",
    module: "Documents",
    time: "2 hours ago",
    dotColor: "default",
  },
  {
    id: "5",
    text: "4 onboarding tasks completed for Engineering cohort",
    module: "Onboarding",
    time: "3 hours ago",
    dotColor: "success",
  },
];

export const peopleSpotlight: PeopleSpotlightItem[] = [
  {
    id: "1",
    initials: "SA",
    name: "Salma Adel",
    role: "Senior Product Designer",
    department: "Product",
    status: { label: "Review due", variant: "warn" },
    nextAction: "Schedule Q2 check-in",
    timeOffBalance: "14 days",
  },
  {
    id: "2",
    initials: "YK",
    name: "Youssef Khaled",
    role: "Frontend Engineer",
    department: "Engineering",
    status: { label: "Active", variant: "teal" },
    nextAction: "Approve equipment request",
    timeOffBalance: "9 days",
  },
  {
    id: "3",
    initials: "NM",
    name: "Nour Mostafa",
    role: "People Partner",
    department: "People Ops",
    status: { label: "Attendance flag", variant: "risk" },
    nextAction: "Resolve attendance exception",
    timeOffBalance: "21 days",
  },
  {
    id: "4",
    initials: "OA",
    name: "Omar Amin",
    role: "Sales Manager",
    department: "Sales",
    status: { label: "Complete", variant: "done" },
    nextAction: "Archive signed addendum",
    timeOffBalance: "6 days",
  },
  {
    id: "5",
    initials: "LR",
    name: "Lina Riad",
    role: "Legal Counsel",
    department: "Legal",
    status: { label: "Contract review", variant: "info" },
    nextAction: "Renewal clause — legal sign-off",
    timeOffBalance: "18 days",
  },
];

export const headcountTrend = {
  months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  data: [200, 210, 218, 225, 230, 235, 238, 240, 242, 245, 247, 248],
  target: 260,
};
