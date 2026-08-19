import type { TFunction } from "i18next";

/** The namespace holding every audit label: events, payload fields, and page chrome. */
export const auditNamespace = "audit";

export type AuditTranslate = TFunction<typeof auditNamespace>;

/** Turns a contract key — `company.lifecycle.created`, `IN_PROGRESS`, `taxNumber` — into words. */
export function humanizeAuditKey(value: string): string {
  const words = value
    .replace(/[-_.]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * The words for a derived event domain or family. The taxonomy is computed from the catalog
 * rather than authored, so the label derives by default — a family the catalog adds never
 * renders as a raw token — and the namespace carries an override only where it should read
 * differently, which is also how a locale gains its own wording for one.
 */
export function auditGroupLabel(t: AuditTranslate, group: string): string {
  return t(`chrome.group.${group}`, { defaultValue: humanizeAuditKey(group) });
}
