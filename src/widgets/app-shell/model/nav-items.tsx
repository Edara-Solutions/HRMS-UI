import { Home, LockKeyhole, Monitor, UserRound } from "lucide-react";
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
  profile: <UserRound size={17} />,
  security: <LockKeyhole size={17} />,
  sessions: <Monitor size={17} />,
};
export function buildNavGroups(facts: AccessFacts, locale: SupportedLocale): NavGroup[] {
  const items = projectNavigation(facts).map((route) => ({
    label: route.label?.[locale] ?? "",
    href: route.path,
    icon: icons[route.path.split("/").at(-1) ?? ""] ?? <Home size={17} />,
  }));
  return items.length ? [{ title: locale === "ar" ? "مساحة العمل" : "Workspace", items }] : [];
}
