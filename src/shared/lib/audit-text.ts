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
