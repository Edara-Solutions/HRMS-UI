import { Outlet } from "@tanstack/react-router";
import { AppShell } from "@/shared/layout";

export function AdminLayout() {
  return (
    <AppShell portal="admin">
      <Outlet />
    </AppShell>
  );
}
