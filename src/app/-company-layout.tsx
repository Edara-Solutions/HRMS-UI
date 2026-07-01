import { Outlet } from "@tanstack/react-router";
import { AppShell } from "@/shared/layout/app-shell";

export function CompanyLayout() {
  return (
    <AppShell portal="company">
      <Outlet />
    </AppShell>
  );
}
