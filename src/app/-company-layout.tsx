import { AppShell } from "@/shared/layout/app-shell";
import { Outlet } from "@tanstack/react-router";

export function CompanyLayout() {
  return (
    <AppShell portal="company">
      <Outlet />
    </AppShell>
  );
}
