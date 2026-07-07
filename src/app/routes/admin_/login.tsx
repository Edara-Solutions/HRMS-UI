/*
 * Route lives in `admin_/` (note the TRAILING underscore), not `admin/`.
 *
 * In TanStack Router's directory routing a trailing underscore means
 * "keep the URL segment but opt OUT of the parent's layout nesting". So this
 * file still serves the URL `/admin/login`, yet it does NOT render inside
 * `admin/route.tsx` — the admin portal shell.
 *
 * That escape is deliberate. `admin/route.tsx` does two things to everything
 * nested under it: (1) `requireAuthenticated({ platformAdminOnly: true })` and
 * (2) wraps children in `<AppShell>`. The login screen must do neither — you
 * cannot be authenticated *before* logging in, and a login form should not sit
 * inside the authenticated app chrome. `admin_/login` gives us `/admin/login`
 * while escaping both the auth guard and the shell.
 *
 * The only guard that DOES apply here is `requireAdminConsoleEnabled` (the
 * admin console build flag) — reachability, not authentication.
 */
import { createFileRoute } from "@tanstack/react-router";
import { requireAdminConsoleEnabled } from "@/app/guards/auth-guards";
import { AdminLoginPage } from "@/pages/admin/login";

export const Route = createFileRoute("/admin_/login")({
  beforeLoad: () => requireAdminConsoleEnabled(),
  component: AdminLoginPage,
});
