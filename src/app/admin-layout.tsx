import { AppShell } from "@/shared/layout/app-shell";
import { Outlet } from "@tanstack/react-router";

export function AdminLayout() {
  return (
    <AppShell portal="admin">
      <Outlet />
    </AppShell>
  );
}
