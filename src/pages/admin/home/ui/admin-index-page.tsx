/*
 * Landing screen for the `/admin` index route (rendered by
 * `app/routes/admin/index.tsx`). This is the bare entry point shown when you
 * hit the admin portal root — NOT the analytics dashboard, which is a separate
 * screen at `/admin/dashboard` (`pages/admin/dashboard`).
 *
 * It is an intentional PLACEHOLDER: the real admin landing is deferred until
 * the module-scaffold phase, so this slice deliberately holds no data access or
 * business logic. Kept as its own `pages/admin/home` slice (rather than folded
 * into the dashboard) so the index route has a stable home to grow into without
 * disturbing the dashboard slice.
 */
export function AdminIndexPage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <p className="text-sm font-medium text-[var(--color-primary)]">SaaS Admin Portal</p>
      <h1 className="mt-3 text-3xl font-semibold">Admin placeholder</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-text-muted)]">
        Leads, companies, subscriptions, plans, pricing, and audit remain deferred until the module
        scaffold phase.
      </p>
    </section>
  );
}
