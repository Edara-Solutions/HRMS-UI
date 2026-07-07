export function ForbiddenPage() {
  return (
    <section className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-4 sm:px-6">
      <p className="text-sm font-medium text-[var(--color-danger)]">403</p>
      <h1 className="mt-3 text-3xl font-semibold">Permission required</h1>
      <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">
        This placeholder is used by route-level permission guards until real access-denied screens
        are implemented.
      </p>
    </section>
  );
}
