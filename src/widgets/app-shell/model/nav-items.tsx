import {
  Building2,
  Home,
  KeyRound,
  ListChecks,
  LockKeyhole,
  Monitor,
  UserRound,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import { type AccessFacts, projectNavigation } from "@/shared/auth";
import type { SupportedLocale } from "@/shared/i18n";

export interface NavIndicator {
  label: string;
  tone: "neutral" | "primary" | "info" | "success" | "warning" | "danger";
  effect?: "pulse";
}
export interface NavItem {
  label: string;
  localizedLabels?: { en: string; ar: string };
  href: string;
  icon: ReactNode;
  indicator?: NavIndicator;
}
export interface NavGroup {
  title: string;
  items: NavItem[];
}
const icons: Record<string, ReactNode> = {
  dashboard: <Home size={17} />,
  "me/profile": <UserRound size={17} />,
  "me/security": <LockKeyhole size={17} />,
  "me/sessions": <Monitor size={17} />,
  profile: <Building2 size={17} />,
  setup: <ListChecks size={17} />,
  people: <Users size={17} />,
  roles: <KeyRound size={17} />,
};
export function buildNavGroups(facts: AccessFacts, locale: SupportedLocale): NavGroup[] {
  const items = projectNavigation(facts).map((route) => ({
    label: route.label?.[locale] ?? "",
    href: route.path,
    icon: icons[route.path.split("/").slice(2).join("/")] ?? <Home size={17} />,
  }));
  return items.length ? [{ title: locale === "ar" ? "مساحة العمل" : "Workspace", items }] : [];
}
