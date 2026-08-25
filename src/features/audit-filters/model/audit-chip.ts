/**
 * The audit filter bar's one control shape: a short bordered chip that names a filter and
 * carries its value. Every control on the bar wears it — pickers, the trace tag, and the link
 * out to the catalog — so the row reads as one set of objects rather than several.
 */
export const auditChipClassName =
  "h-8 border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 text-[12.5px] font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]";

/** The same chip once it carries a value: navy, the only accent this trail spends. */
export const auditChipActiveClassName =
  "border-[color-mix(in_srgb,var(--color-primary)_30%,transparent)] bg-[var(--color-primary-soft)] text-[var(--color-primary)] hover:bg-[color-mix(in_srgb,var(--color-primary-soft)_92%,var(--color-primary))] hover:text-[var(--color-primary)]";
